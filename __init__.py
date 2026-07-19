from .lora_tag_loader import LoraLoaderMasterDB, CLIPTextEncodeWithTags

NODE_CLASS_MAPPINGS = {
    "LoraLoaderMasterDB": LoraLoaderMasterDB,
    "CLIPTextEncodeWithTags": CLIPTextEncodeWithTags
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoraLoaderMasterDB": "LoRA Loader (LoraTags)",
    "CLIPTextEncodeWithTags": "CLIP Text Encode (Auto-Tags)"
}

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
