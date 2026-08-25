from setuptools import setup, find_packages

# The pipeline/ directory IS the warframe_marketplace_predictor package.
# Its modules (filepaths.py, shtuff/, training/, tool_setup_and_maintenance/,
# riven_tool/) sit directly under pipeline/, so we map the package name to
# this directory and also expose the flat top-level modules.
setup(
    name="warframe_marketplace_predictor",
    version="1.0.0",
    package_dir={
        "warframe_marketplace_predictor": ".",
        "warframe_marketplace_predictor.shtuff": "shtuff",
        "warframe_marketplace_predictor.training": "training",
        "warframe_marketplace_predictor.tool_setup_and_maintenance": "tool_setup_and_maintenance",
        "warframe_marketplace_predictor.riven_tool": "riven_tool",
    },
    packages=[
        "warframe_marketplace_predictor",
        "warframe_marketplace_predictor.shtuff",
        "warframe_marketplace_predictor.training",
        "warframe_marketplace_predictor.training.preprocessors",
        "warframe_marketplace_predictor.training.trainers",
        "warframe_marketplace_predictor.tool_setup_and_maintenance",
        "warframe_marketplace_predictor.riven_tool",
    ],
    py_modules=[],
    include_package_data=True,
)
