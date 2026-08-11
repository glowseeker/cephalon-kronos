use std::fs;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

const NEEDLE: &[u8] = b"?accountId=";
const NONCE_PREFIX: &[u8] = b"&nonce=";
const SESSION_PREFIX: &[u8] = b"&sessionId=";
const SESSION_SEARCH_RANGE: usize = 200;
const CHUNK: u64 = 65536;
const OVERLAP: usize = 256;

pub(crate) struct MemRegion {
    pub(crate) start: u64,
    pub(crate) end: u64,
}

/// Caches the anonymous memory region where the auth string was last found.
/// Warframe typically reuses the same heap buffer for API URL construction,
/// so a cached region is likely to contain the active auth token on the next
/// periodic fetch - avoids a full region walk on the common path.
static AUTH_LOCATION: Mutex<Option<MemRegion>> = Mutex::new(None);
static SCAN_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

pub fn scan_auth(pid: u32) -> Option<String> {
    // Fast path: try the region where auth was found last time.
    if let Ok(cache) = AUTH_LOCATION.lock() {
        if let Some(ref region) = *cache {
            let result = scan_single_region(pid, region);
            if result.is_some() {
                return result;
            }
        }
    }

    // Reentrancy guard: collapse concurrent full walks into one.
    if SCAN_IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return None;
    }
    let start = std::time::Instant::now();
    let result = (|| {
        let regions = readable_anonymous_regions(pid)?;

        #[cfg(target_os = "linux")]
        {
            let mem_file = fs::File::open(format!("/proc/{pid}/mem")).ok()?;
            for region in &regions {
                if let Some(auth) = scan_region_linux(&mem_file, region) {
                    if let Ok(mut cache) = AUTH_LOCATION.lock() {
                        *cache = Some(MemRegion { start: region.start, end: region.end });
                    }
                    return Some(auth);
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            for region in &regions {
                if let Some(auth) = scan_region_windows(pid, region) {
                    if let Ok(mut cache) = AUTH_LOCATION.lock() {
                        *cache = Some(MemRegion { start: region.start, end: region.end });
                    }
                    return Some(auth);
                }
            }
        }

        #[cfg(not(any(target_os = "linux", target_os = "windows")))]
        let _ = regions;

        None
    })();
    eprintln!("[AUTH_SCAN] full walk took {:?}, found={}", start.elapsed(), result.is_some());
    SCAN_IN_PROGRESS.store(false, Ordering::SeqCst);
    result
}

/// Quick one-region scan used by the auth location cache fast path.
fn scan_single_region(pid: u32, region: &MemRegion) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        let mem_file = fs::File::open(format!("/proc/{pid}/mem")).ok()?;
        scan_region_linux(&mem_file, region)
    }
    #[cfg(target_os = "windows")]
    {
        scan_region_windows(pid, region)
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    { let _ = (pid, region); None }
}

// ── Shared chunk scanning logic ─────────────────────────────────────────────
// Both platforms call scan_chunk_for_auth with the raw bytes read from a chunk,
// avoiding duplication of the pattern-matching and extraction logic.

fn scan_chunk_for_auth(buf: &[u8], search_end: usize) -> Option<String> {
    for i in 0..search_end.saturating_sub(NEEDLE.len()) {
        if buf[i..i + NEEDLE.len()] != *NEEDLE {
            continue;
        }
        let acct_start = i + NEEDLE.len();
        let acct_end = acct_start + 24;
        if acct_end > search_end {
            continue;
        }
        if !buf[acct_start..acct_end].iter().all(|&b| b.is_ascii_hexdigit()) {
            continue;
        }
        let account_id = match std::str::from_utf8(&buf[acct_start..acct_end]) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let remaining = &buf[acct_end..search_end];
        let nonce_pos = match remaining.windows(NONCE_PREFIX.len()).position(|w| w == NONCE_PREFIX) {
            Some(p) => p,
            None => continue,
        };
        let nonce_start = acct_end + nonce_pos + NONCE_PREFIX.len();
        let nonce_end = nonce_start
            + remaining[nonce_pos + NONCE_PREFIX.len()..]
                .iter()
                .position(|&b| !b.is_ascii_alphanumeric())
                .unwrap_or(0);
        let nonce = match std::str::from_utf8(&buf[nonce_start..nonce_end]) {
            Ok(s) => s,
            Err(_) => continue,
        };
        if nonce.is_empty() {
            continue;
        }

        let mut auth = format!("?accountId={account_id}&nonce={nonce}");

        let session_search_end = (nonce_end + SESSION_SEARCH_RANGE).min(search_end);
        let session_region = &buf[nonce_end..session_search_end];
        if let Some(sess_pos) = session_region.windows(SESSION_PREFIX.len()).position(|w| w == SESSION_PREFIX) {
            let sess_start = nonce_end + sess_pos + SESSION_PREFIX.len();
            let sess_end = sess_start
                + session_region[sess_pos + SESSION_PREFIX.len()..]
                    .iter()
                    .position(|&b| !b.is_ascii_hexdigit())
                    .unwrap_or(0);
            if sess_end > sess_start {
                if let Ok(session_id) = std::str::from_utf8(&buf[sess_start..sess_end]) {
                    if !session_id.is_empty() {
                        auth.push_str("&sessionId=");
                        auth.push_str(session_id);
                    }
                }
            }
        }

        return Some(auth);
    }
    None
}

// ── Linux: /proc/<pid>/maps + /proc/<pid>/mem ───────────────────────────────

#[cfg(target_os = "linux")]
pub(crate) fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    let maps = fs::read_to_string(format!("/proc/{pid}/maps")).ok()?;
    let mut regions = Vec::new();
    for line in maps.lines() {
        let mut cols = line.split_whitespace();
        let range = cols.next()?;
        let perms = cols.next()?;
        if !perms.starts_with('r') {
            continue;
        }
        let _ = (cols.next(), cols.next(), cols.next());
        let path = cols.next().unwrap_or("");
        let is_anon = path.is_empty() || path.starts_with('[');
        let is_writable = perms.contains('w');
        if !is_anon && !is_writable {
            continue;
        }
        let (s, e) = range.split_once('-')?;
        let start = u64::from_str_radix(s, 16).ok()?;
        let end = u64::from_str_radix(e, 16).ok()?;
        regions.push(MemRegion { start, end });
    }
    Some(regions)
}

#[cfg(target_os = "linux")]
fn scan_region_linux(mem_file: &fs::File, region: &MemRegion) -> Option<String> {
    use std::os::unix::fs::FileExt;

    let total = (region.end - region.start) as usize;
    let mut buf = vec![0u8; CHUNK as usize];
    let stride = CHUNK - OVERLAP as u64;
    let mut offset = 0u64;

    while offset < total as u64 {
        let want = (total as u64 - offset).min(CHUNK) as usize;
        if mem_file.read_at(&mut buf[..want], region.start + offset).ok()? < want {
            break;
        }
        if let Some(auth) = scan_chunk_for_auth(&buf, want) {
            return Some(auth);
        }
        if want < CHUNK as usize {
            break;
        }
        offset += stride;
    }

    None
}

// ── Windows: VirtualQueryEx + ReadProcessMemory ─────────────────────────────

#[cfg(target_os = "windows")]
pub(crate) fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;
    type LPCVOID = *const std::ffi::c_void;
    type SizeT = usize;

    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;
    const PROCESS_VM_READ: DWORD = 0x0010;
    const MEM_COMMIT: DWORD = 0x1000;
    const MEM_PRIVATE: DWORD = 0x20000;
    const PAGE_READONLY: DWORD = 0x02;
    const PAGE_READWRITE: DWORD = 0x04;
    const PAGE_EXECUTE_READ: DWORD = 0x20;
    const PAGE_EXECUTE_READWRITE: DWORD = 0x40;

    #[repr(C)]
    struct MEMORY_BASIC_INFORMATION {
        base_address: LPCVOID,
        allocation_base: LPCVOID,
        allocation_protect: DWORD,
        region_size: SizeT,
        state: DWORD,
        protect: DWORD,
        type_: DWORD,
    }

    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn VirtualQueryEx(hProcess: HANDLE, lpAddress: LPCVOID, lpBuffer: *mut MEMORY_BASIC_INFORMATION, dwLength: SizeT) -> SizeT;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    let handle = unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid) };
    if handle.is_null() {
        return None;
    }

    let mut regions = Vec::new();
    let mut address: u64 = 0;
    loop {
        let mut mbi = MEMORY_BASIC_INFORMATION {
            base_address: std::ptr::null(),
            allocation_base: std::ptr::null(),
            allocation_protect: 0,
            region_size: 0,
            state: 0,
            protect: 0,
            type_: 0,
        };
        let ret = unsafe {
            VirtualQueryEx(
                handle,
                address as LPCVOID,
                &mut mbi,
                std::mem::size_of::<MEMORY_BASIC_INFORMATION>(),
            )
        };
        if ret == 0 {
            break;
        }
        if mbi.region_size > 0 {
            let is_readable = (mbi.protect
                & (PAGE_READONLY | PAGE_READWRITE | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE))
                != 0;
            let is_anon = mbi.type_ == MEM_PRIVATE;
            if is_readable && is_anon && mbi.state == MEM_COMMIT {
                regions.push(MemRegion {
                    start: address,
                    end: address + mbi.region_size as u64,
                });
            }
            address += mbi.region_size as u64;
        } else {
            break;
        }
    }

    unsafe { CloseHandle(handle); }
    if regions.is_empty() { None } else { Some(regions) }
}

#[cfg(target_os = "windows")]
fn scan_region_windows(pid: u32, region: &MemRegion) -> Option<String> {
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;
    type LPCVOID = *const std::ffi::c_void;
    type LPVOID = *mut std::ffi::c_void;
    type SizeT = usize;
    type LpsizeT = *mut usize;

    const PROCESS_VM_READ: DWORD = 0x0010;

    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn ReadProcessMemory(
            hProcess: HANDLE,
            lpBaseAddress: LPCVOID,
            lpBuffer: LPVOID,
            nSize: SizeT,
            lpNumberOfBytesRead: LpsizeT,
        ) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    let handle = unsafe { OpenProcess(PROCESS_VM_READ, 0, pid) };
    if handle.is_null() {
        return None;
    }

    let total = (region.end - region.start) as usize;
    let mut buf = vec![0u8; CHUNK as usize];
    let stride = CHUNK - OVERLAP as u64;
    let mut offset = 0u64;

    while offset < total as u64 {
        let want = (total as u64 - offset).min(CHUNK) as usize;
        let mut bytes_read: SizeT = 0;
        let ok = unsafe {
            ReadProcessMemory(
                handle,
                (region.start + offset) as LPCVOID,
                buf.as_mut_ptr() as LPVOID,
                want,
                &mut bytes_read as LpsizeT,
            )
        };
        if ok == 0 || bytes_read == 0 {
            break;
        }
        if let Some(auth) = scan_chunk_for_auth(&buf, bytes_read) {
            unsafe { CloseHandle(handle); }
            return Some(auth);
        }
        if bytes_read < CHUNK as usize {
            break;
        }
        offset += stride;
    }

    unsafe { CloseHandle(handle); }
    None
}

/// Score a buffer slice for EE.log-like content: lines starting with a
/// timestamp and containing known log channel tags.
fn ee_log_score(buf: &[u8]) -> usize {
    buf.split(|&b| b == b'\n')
        .filter(|l| l.len() > 12 && l[0].is_ascii_digit())
        .filter(|l| {
            let s = std::str::from_utf8(l).unwrap_or("");
            s.contains("EE [Info]: ")
                || s.contains("Sys [Info]: ")
                || s.contains("Script [Info]: ")
                || s.contains("Net [Info]: ")
                || s.contains("Game [Info]: ")
        })
        .count()
}

/// One-shot discovery: scan all anonymous readable regions for EE.log ring
/// buffer content.  Returns the VA + size of the best-scoring candidate,
/// or None if no region scores above the threshold.
///
/// `buffer_size` is set to the full discovered region size (capped at 1MB
/// as a safety ceiling  -  real ring buffer allocations are typically
/// 128 KB - 512 KB).  This matters because the delta-diff cycle reads
/// exactly `buffer_size` bytes every poll; if the read window is smaller
/// than the actual ring buffer, log lines written outside the window are
/// invisible until the write cursor wraps around, producing the "hella
/// delayed" riven overlay symptom.
pub fn discover_ring_buffer(pid: u32) -> Option<(u64, usize)> {
    const MIN_LOG_SCORE: usize = 3;
    const SCORE_OVERLAP: u64 = 256;
    const MAX_READ_SIZE: usize = 1024 * 1024;

    let regions = readable_anonymous_regions(pid)?;

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::FileExt;
        let mem_file = fs::File::open(format!("/proc/{pid}/mem")).ok()?;
        let mut best_score: usize = 0;
        let mut best_va: u64 = 0;
        let mut best_end: u64 = 0;
        let mut buf = vec![0u8; CHUNK as usize];
        let stride = CHUNK - SCORE_OVERLAP;

        for region in &regions {
            let total = region.end - region.start;
            let mut offset = 0u64;
            while offset < total {
                let want = (total - offset).min(CHUNK) as usize;
                if mem_file.read_at(&mut buf[..want], region.start + offset).is_err() {
                    break;
                }
                let score = ee_log_score(&buf[..want]);
                if score > best_score {
                    best_score = score;
                    best_va = region.start + offset;
                    best_end = region.end;
                }
                if want < CHUNK as usize {
                    break;
                }
                offset += stride;
            }
        }

        if best_score < MIN_LOG_SCORE {
            return None;
        }
        let read_size = (best_end.saturating_sub(best_va)).min(MAX_READ_SIZE as u64) as usize;
        Some((best_va, read_size))
    }

    #[cfg(target_os = "windows")]
    {
        type HANDLE = *mut std::ffi::c_void;
        type BOOL = i32;
        type DWORD = u32;
        type LPCVOID = *const std::ffi::c_void;
        type LPVOID = *mut std::ffi::c_void;
        type SizeT = usize;
        type LpsizeT = *mut usize;

        const PROCESS_VM_READ: DWORD = 0x0010;

        extern "system" {
            fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
            fn ReadProcessMemory(
                hProcess: HANDLE,
                lpBaseAddress: LPCVOID,
                lpBuffer: LPVOID,
                nSize: SizeT,
                lpNumberOfBytesRead: LpsizeT,
            ) -> BOOL;
            fn CloseHandle(hObject: HANDLE) -> BOOL;
        }

        let handle = unsafe { OpenProcess(PROCESS_VM_READ, 0, pid) };
        if handle.is_null() {
            return None;
        }

        let mut best_score: usize = 0;
        let mut best_va: u64 = 0;
        let mut best_end: u64 = 0;
        let mut buf = vec![0u8; CHUNK as usize];
        let stride = CHUNK - SCORE_OVERLAP;

        for region in &regions {
            let total = region.end - region.start;
            let mut offset = 0u64;
            while offset < total {
                let want = (total - offset).min(CHUNK) as usize;
                let mut bytes_read: SizeT = 0;
                let ok = unsafe {
                    ReadProcessMemory(
                        handle,
                        (region.start + offset) as LPCVOID,
                        buf.as_mut_ptr() as LPVOID,
                        want,
                        &mut bytes_read as LpsizeT,
                    )
                };
                if ok == 0 || bytes_read == 0 {
                    break;
                }
                let score = ee_log_score(&buf[..bytes_read]);
                if score > best_score {
                    best_score = score;
                    best_va = region.start + offset;
                    best_end = region.end;
                }
                if bytes_read < CHUNK as usize {
                    break;
                }
                offset += stride;
            }
        }

        unsafe { CloseHandle(handle); }
        if best_score < MIN_LOG_SCORE {
            return None;
        }
        let read_size = (best_end.saturating_sub(best_va)).min(MAX_READ_SIZE as u64) as usize;
        Some((best_va, read_size))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    { let _ = regions; None }
}

// ── macOS ───────────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
pub(crate) fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    let _ = pid;
    None
}
