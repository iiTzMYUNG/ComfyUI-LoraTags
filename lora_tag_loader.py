import os
import json
import hashlib
import folder_paths
import comfy.sd
import comfy.utils
from server import PromptServer
from aiohttp import web

MASTER_TAGS_FILE = os.path.join(os.path.dirname(__file__), "lora_master_tags.json")

def load_master_tags():
    if os.path.exists(MASTER_TAGS_FILE):
        try:
            with open(MASTER_TAGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_master_tags(data_dict):
    with open(MASTER_TAGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data_dict, f, indent=4)

# --- API Routes ---

@PromptServer.instance.routes.get("/loratags/get_hash")
async def get_lora_hash(request):
    lora_name = request.rel_url.query.get("lora_name", "")
    if not lora_name:
        return web.json_response({"error": "No lora_name provided"}, status=400)
    
    lora_path = folder_paths.get_full_path("loras", lora_name)
    if not lora_path or not os.path.exists(lora_path):
        return web.json_response({"error": "File not found"}, status=404)
        
    sha256_hash = hashlib.sha256()
    with open(lora_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096 * 1024), b""):
            sha256_hash.update(byte_block)
            
    return web.json_response({"hash": sha256_hash.hexdigest().upper()})

@PromptServer.instance.routes.post("/loratags/save_tags")
async def save_tags_endpoint(request):
    data = await request.json()
    lora_name = data.get("lora_name")
    tags = data.get("tags")
    
    folder_path, filename = os.path.split(lora_name)
    category = folder_path.replace("\\", "/") if folder_path else "Uncategorized"
    
    master_db = load_master_tags()
    if category not in master_db:
        master_db[category] = {}
        
    master_db[category][filename] = tags
    save_master_tags(master_db)
    
    return web.json_response({"status": "success"})

# NEW: Quick fetch route to grab tags instantly for the canvas UI
@PromptServer.instance.routes.get("/loratags/get_tags")
async def get_tags_endpoint(request):
    lora_name = request.rel_url.query.get("lora_name", "")
    if not lora_name:
        return web.json_response({"tags": ""})
        
    folder_path, filename = os.path.split(lora_name)
    category = folder_path.replace("\\", "/") if folder_path else "Uncategorized"
    master_db = load_master_tags()
    tags = master_db.get(category, {}).get(filename, "")
    
    return web.json_response({"tags": tags})

# --- Standard Node Logic ---
class LoraLoaderMasterDB:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {
            "model": ("MODEL",),
            "clip": ("CLIP", ),
            # We use a hidden JSON string to pass the stacked list from JS to Python
            "lora_stack_data": ("STRING", {"default": "[]"}),
            # Dummy list to give our JS access to the filesystem loras
            "dummy_list": (folder_paths.get_filename_list("loras"), ),
        }}

    # Removed the STRING output, now it just passes MODEL and CLIP
    RETURN_TYPES = ("MODEL", "CLIP")
    FUNCTION = "load_stacked_loras"
    CATEGORY = "loaders"

    def load_stacked_loras(self, model, clip, lora_stack_data, dummy_list):
        try:
            lora_list = json.loads(lora_stack_data)
        except Exception:
            lora_list = []

        # Loop through every LoRA the user added to the node
        for lora in lora_list:
            name = lora.get("name")
            strength = lora.get("strength", 1.0)
            enabled = lora.get("enabled", True)
            
            # Skip if disabled, empty, or strength is 0
            if not enabled or not name or strength == 0:
                continue

            lora_path = folder_paths.get_full_path("loras", name)
            if not lora_path:
                print(f"[LoRA Tags] Warning: Could not find {name}")
                continue
                
            # Standard load logic
            loaded_lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            model, clip = comfy.sd.load_lora_for_models(model, clip, loaded_lora, strength, strength)

        return (model, clip)