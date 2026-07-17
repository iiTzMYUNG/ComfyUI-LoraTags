from .lora_tag_loader import LoraLoaderMasterDB

# Maps the internal class name to the node logic
NODE_CLASS_MAPPINGS = {
    "LoraLoaderMasterDB": LoraLoaderMasterDB
}

# This is the name you will see when you search for the node and on the canvas
NODE_DISPLAY_NAME_MAPPINGS = {
    "LoraLoaderMasterDB": "LoRA Loader (OpenLoraTags)"
}

# Tells ComfyUI to load the javascript files in this folder
WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']