# ComfyUI-LoraTags 🏷️

![ComfyUI](https://img.shields.io/badge/ComfyUI-Extension-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**ComfyUI-LoraTags** is a sleek, highly optimized LoRA loader for ComfyUI. It replaces the standard LoRA loading experience with a modern tag management system, automated Civitai metadata fetching, and seamless multi-LoRA stacking — all inside a single, thoughtfully designed custom node.

![ComfyUI LoraTags Node & Auto-Tags Text Encoder](docs/LoraTagsNodes.png)

---

## ✨ Key Features

### 📚 Infinite LoRA Stacking
Keep your workflows clean. Instead of daisy-chaining multiple standard LoRA loaders, LoraTags lets you stack as many LoRAs as you need inside a single node. Toggle them on/off, adjust strengths, or delete them with a single click.

### 🌐 Automated Civitai Integration
Click the **`i`** (Info) button on any LoRA to open the Tag Manager modal. The plugin calculates the SHA256 hash of your `.safetensors` file and queries the Civitai API to fetch:
- The official model name
- The original trained trigger words
- Up to 4 preview images
- A direct link to the model's Civitai page

### 🧠 Master Database Tag Manager
No more `.txt` companion files cluttering your hard drive. All tags are saved to a centralized `lora_master_tags.json` file inside the plugin folder.
- **Locked tags (green bubbles):** retrieved automatically from Civitai
- **Custom tags (blue bubbles):** typed in manually — add, edit, or remove at will

### 🔗 Auto-Tagging CLIP Text Encoder
Route all your active LoRA trigger words directly into your prompt. Connect the `TAGS` output to the custom **CLIP Text Encode (Auto-Tags)** node, and your saved triggers are automatically appended to your prompt. Active tags are displayed as responsive bubbles right on the canvas.

### 📋 One-Click Clipboard Copying
Prefer manual prompting? Your saved trigger words are shown right on the canvas beneath each LoRA. Click the `📋` icon to instantly copy them to your clipboard.

### 🎨 Modern Canvas UI
Built with a custom HTML5 Canvas rendering engine that bypasses the default LiteGraph widgets, featuring:
- Smooth, iOS-style toggle switches
- Glassmorphism panels with semi-transparent borders
- Clean, minimalist typography and icons

---

## 📦 Installation

### Method 1 — ComfyUI Manager *(coming soon)*
Once approved in the ComfyUI Manager registry, you'll be able to search for `ComfyUI-LoraTags` in the custom nodes list and install with one click.

### Method 2 — Git Clone (recommended)
```bash
cd ComfyUI/custom_nodes/
git clone https://github.com/iiTzMYUNG/ComfyUI-LoraTags.git
```
Then restart ComfyUI and hard-refresh your browser (`Ctrl+Shift+R`).

### Method 3 — Manual Download
1. Click the green **`<> Code`** button at the top of this repo and select **Download ZIP**.
2. Extract the `.zip` file.
3. Move the extracted `ComfyUI-LoraTags` folder into your `ComfyUI/custom_nodes/` directory.
4. Restart ComfyUI and hard-refresh your browser.

---

## 🚀 How to Use

1. **Add the nodes** — double-click the canvas and search for `LoRA Loader (LoraTags)` and `CLIP Text Encode (Auto-Tags)`.
2. **Connect the wires** — link the `TAGS` output from the LoRA Loader to the `tags` input of the Auto-Tags Text Encoder.
3. **Stack LoRAs** — click **`+ Add LoRA`** to create a new slot, then choose a `.safetensors` file from the dropdown.
4. **Manage tags** — click the **`i`** icon on any LoRA row to fetch tags from Civitai or add your own.
5. **Generate** — type your base prompt; active tags are appended automatically.

---

## 📂 File Structure & the Master Database

Saving tags generates a `lora_master_tags.json` file inside the `ComfyUI-LoraTags` directory.

The plugin respects your existing folder structure — for example, `models/loras/SDXL/neon.safetensors` will be categorized under an `SDXL` header in the JSON. This keeps the database portable, so you can back it up or share it with friends as a single file.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Check the [issues page](https://github.com/iiTzMYUNG/ComfyUI-LoraTags/issues) if you'd like to help improve the UI or add functionality.

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
