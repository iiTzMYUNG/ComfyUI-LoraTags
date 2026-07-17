import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.LoraTags",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LoraLoaderMasterDB") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            const onConfigure = nodeType.prototype.onConfigure;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                const node = this;
                node.loraStack = []; 

                const dataWidget = node.widgets.find(w => w.name === "lora_stack_data");
                const dummyWidget = node.widgets.find(w => w.name === "dummy_list");
                
                if (dataWidget) hideWidget(dataWidget);
                if (dummyWidget) {
                    node.loraFiles = dummyWidget.options.values || [];
                    dummyWidget.value = node.loraFiles[0] || ""; 
                    hideWidget(dummyWidget);
                }

                if (!dataWidget.value || dataWidget.value === "[]") {
                    node.loraStack.push({ name: "", strength: 1.0, enabled: true, tags: "" });
                    syncStateToWidget(node);
                }

                const stackWidget = createStackWidget(node);
                node.addCustomWidget(stackWidget);

                const idx = node.widgets.indexOf(stackWidget);
                if (idx > 0) {
                    node.widgets.splice(idx, 1);
                    node.widgets.unshift(stackWidget);
                }

                return r;
            };

            nodeType.prototype.onConfigure = function (info) {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                const dataWidget = this.widgets.find(w => w.name === "lora_stack_data");
                if (dataWidget && dataWidget.value) {
                    try {
                        this.loraStack = JSON.parse(dataWidget.value);
                        this.loraStack.forEach((lora, i) => updateTagsForIndex(this, i, lora.name));
                    } catch (e) {
                        this.loraStack = [];
                    }
                }
                return r;
            }
        }
    }
});

// --- Helpers ---------------------------------------------------------------

function hideWidget(widget) {
    widget.computeSize = () => [0, -4];
    widget.type = "loratags_hidden";
    widget.hidden = true;
}

function syncStateToWidget(node) {
    const dataWidget = node.widgets.find(w => w.name === "lora_stack_data");
    if (dataWidget) {
        dataWidget.value = JSON.stringify(node.loraStack);
    }
    node.setDirtyCanvas(true, true);
}

async function updateTagsForIndex(node, index, loraName) {
    if (!loraName) {
        node.loraStack[index].tags = "";
        syncStateToWidget(node);
        return;
    }
    try {
        const res = await fetch(`/loratags/get_tags?lora_name=${encodeURIComponent(loraName)}`);
        const data = await res.json();
        node.loraStack[index].tags = data.tags || "";
        syncStateToWidget(node);
    } catch (e) {
        console.error("Failed to fetch tags", e);
    }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + "…";
}

// --- Custom Stack Widget -------------------------------------------------

function createStackWidget(node) {
    const widget = {
        name: "lora_stack",
        type: "custom",
        value: null,
        hitBoxes: [], 
        
        computeSize(width) {
            let height = 10; 
            node.loraStack.forEach(lora => {
                height += 40; 
                if (lora.name) height += 28; 
            });
            height += 36; 
            return [width, height];
        },
        
        draw(ctx, drawNode, widgetWidth, posY) {
            const margin = 10;
            const w = widgetWidth - margin * 2;
            let currentY = posY + 10;
            
            widget.hitBoxes = []; 
            ctx.save();

            node.loraStack.forEach((lora, i) => {
                const rowH = 34;
                const cy = currentY + rowH / 2;
                const enabled = lora.enabled !== false;

                ctx.fillStyle = enabled ? "#27272a" : "#18181b"; 
                drawRoundedRect(ctx, margin, currentY, w, rowH, 6);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"; 
                ctx.lineWidth = 1;
                ctx.stroke();

                const toggleW = 32, toggleH = 18, toggleX = margin + 10, toggleY = cy - toggleH / 2;
                ctx.fillStyle = enabled ? "#3b82f6" : "#3f3f46"; 
                drawRoundedRect(ctx, toggleX, toggleY, toggleW, toggleH, toggleH / 2);
                ctx.fill();
                
                ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 1;
                ctx.fillStyle = "#ffffff";
                const knobX = enabled ? toggleX + toggleW - toggleH / 2 : toggleX + toggleH / 2;
                ctx.beginPath(); ctx.arc(knobX, cy, toggleH / 2 - 2, 0, Math.PI * 2); ctx.fill();
                ctx.shadowColor = "transparent"; 
                widget.hitBoxes.push({ type: 'toggle', index: i, box: [toggleX, toggleY, toggleW, toggleH] });

                const trashX = margin + w - 26;
                ctx.fillStyle = "#ef4444"; 
                ctx.font = "bold 14px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("✕", trashX + 5, cy + 1); 
                widget.hitBoxes.push({ type: 'delete', index: i, box: [trashX - 8, cy - 10, 26, 20] });

                const arrowW = 16, valueW = 40, stepperW = arrowW + valueW + arrowW;
                const stepperX = trashX - 16 - stepperW;
                ctx.fillStyle = enabled ? "#a1a1aa" : "#52525b";
                ctx.textAlign = "center";
                ctx.font = "12px sans-serif";
                ctx.fillText("◀", stepperX + arrowW / 2, cy + 1);
                widget.hitBoxes.push({ type: 'left_arrow', index: i, box: [stepperX, currentY, arrowW, rowH] });
                
                const valX = stepperX + arrowW;
                ctx.fillStyle = enabled ? "#f4f4f5" : "#71717a"; 
                ctx.fillText(lora.strength.toFixed(2), valX + valueW / 2, cy + 1);
                widget.hitBoxes.push({ type: 'value', index: i, box: [valX, currentY, valueW, rowH] });

                ctx.fillStyle = enabled ? "#a1a1aa" : "#52525b";
                ctx.fillText("▶", valX + valueW + arrowW / 2, cy + 1);
                widget.hitBoxes.push({ type: 'right_arrow', index: i, box: [valX + valueW, currentY, arrowW, rowH] });

                const infoW = 20, infoX = stepperX - 12 - infoW;
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; 
                ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                drawRoundedRect(ctx, infoX, cy - infoW / 2, infoW, infoW, 4);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = "#d4d4d8"; 
                ctx.font = "italic 13px serif";
                ctx.fillText("i", infoX + infoW / 2, cy + 1);
                widget.hitBoxes.push({ type: 'info', index: i, box: [infoX, cy - infoW / 2, infoW, infoW] });

                const nameStartX = toggleX + toggleW + 12;
                const nameAreaW = infoX - 12 - nameStartX;
                ctx.font = "13px sans-serif"; 
                ctx.textAlign = "left";
                ctx.fillStyle = enabled ? "#e4e4e7" : "#71717a";
                const shortName = lora.name ? lora.name.split(/[\\/]/).pop() : "Select a LoRA...";
                ctx.fillText(truncateText(ctx, shortName, nameAreaW), nameStartX, cy + 1);
                widget.hitBoxes.push({ type: 'name', index: i, box: [nameStartX, currentY, nameAreaW, rowH] });

                currentY += rowH + 6; 

                if (lora.name) {
                    const copyIconX = margin + 14;
                    
                    ctx.fillStyle = enabled ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.03)";
                    drawRoundedRect(ctx, margin + 4, currentY, w - 8, 22, 4);
                    ctx.fill();

                    ctx.font = "12px sans-serif";
                    ctx.fillStyle = enabled ? "#34d399" : "#71717a";
                    ctx.fillText(lora.copied ? "✔️" : "📋", copyIconX, currentY + 15);
                    widget.hitBoxes.push({ type: 'copy', index: i, box: [copyIconX - 5, currentY, 24, 22] });
                    
                    ctx.font = "12px monospace";
                    const tagText = lora.tags || "(No tags saved)";
                    ctx.fillText(truncateText(ctx, tagText, w - 50), copyIconX + 22, currentY + 15);
                    
                    currentY += 28;
                } else {
                    currentY += 2; 
                }
            });

            const addBtnY = currentY;
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)"; 
            drawRoundedRect(ctx, margin, addBtnY, w, 28, 6);
            ctx.fill(); 
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)"; 
            ctx.stroke();
            
            ctx.fillStyle = "#a1a1aa"; 
            ctx.textAlign = "center"; 
            ctx.font = "13px sans-serif";
            ctx.fillText("+ Add LoRA", widgetWidth / 2, addBtnY + 18);
            widget.hitBoxes.push({ type: 'add_btn', index: -1, box: [margin, addBtnY, w, 28] });

            ctx.restore();
        },
        
        mouse(event, pos, mouseNode) {
            if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
            const [px, py] = pos;
            const hit = widget.hitBoxes.find(b => px >= b.box[0] && px <= b.box[0] + b.box[2] && py >= b.box[1] && py <= b.box[1] + b.box[3]);
            
            if (!hit) return false;
            const lora = mouseNode.loraStack[hit.index];

            switch(hit.type) {
                case 'add_btn':
                    mouseNode.loraStack.push({ name: "", strength: 1.0, enabled: true, tags: "" });
                    syncStateToWidget(mouseNode);
                    return true;
                    
                case 'delete':
                    mouseNode.loraStack.splice(hit.index, 1);
                    syncStateToWidget(mouseNode);
                    return true;

                case 'toggle':
                    lora.enabled = !lora.enabled;
                    syncStateToWidget(mouseNode);
                    return true;

                case 'left_arrow':
                    lora.strength = Math.round((lora.strength - 0.05) * 100) / 100;
                    syncStateToWidget(mouseNode);
                    return true;
                    
                case 'right_arrow':
                    lora.strength = Math.round((lora.strength + 0.05) * 100) / 100;
                    syncStateToWidget(mouseNode);
                    return true;
                    
                case 'value':
                    const v = prompt("Enter LoRA strength", lora.strength.toFixed(2));
                    if (v !== null && !isNaN(parseFloat(v))) {
                        lora.strength = parseFloat(v);
                        syncStateToWidget(mouseNode);
                    }
                    return true;

                case 'info':
                    if (lora.name) {
                        // Pass the current tags directly to the modal
                        openLoraModal(lora.name, lora.tags, () => {
                            updateTagsForIndex(mouseNode, hit.index, lora.name);
                        });
                    }
                    return true;
                    
                case 'name':
                    new LiteGraph.ContextMenu(mouseNode.loraFiles || [], {
                        event,
                        title: "Select LoRA",
                        callback: (value) => {
                            lora.name = value;
                            updateTagsForIndex(mouseNode, hit.index, value);
                        }
                    });
                    return true;

                case 'copy':
                    if (lora.tags) {
                        navigator.clipboard.writeText(lora.tags);
                        lora.copied = true;
                        mouseNode.setDirtyCanvas(true, true);
                        setTimeout(() => { lora.copied = false; mouseNode.setDirtyCanvas(true, true); }, 1000);
                    }
                    return true;
            }
            return false;
        }
    };
    return widget;
}

// --- Civitai Tag Manager Modal ---
async function openLoraModal(loraName, currentTags = "", onSaveCallback) {
    let civitaiWords = [];
    // Start with any tags that were already saved locally
    let customWords = currentTags ? currentTags.split(',').map(t => t.trim()).filter(t => t) : [];

    const dialog = document.createElement("dialog");
    dialog.style.cssText = "background: #18181b; color: #e4e4e7; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 700px; font-family: sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.8);";

    dialog.innerHTML = `
        <h3 style="margin-top:0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; font-weight: 500;">Model Info: <span style="color:#3b82f6">${loraName}</span></h3>
        <p id="status_text" style="color: #a1a1aa;">Calculating file hash... Please wait.</p>

        <div id="civitai_content" style="display:none; margin-bottom: 20px; font-size: 14px; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
            <p style="margin-top:0;"><strong>Civitai Name:</strong> <span id="c_name" style="color:#fff;"></span></p>
            <p style="margin-bottom:0; font-size: 13px; color: #a1a1aa;"><strong>Trained Words Status:</strong> <span id="c_words_status"></span></p>
            <div id="c_images" style="display:flex; gap: 12px; overflow-x: auto; max-height: 250px; margin-top: 15px; padding-bottom: 5px;"></div>
        </div>

        <label style="font-weight: 500; font-size: 14px; color: #a1a1aa;">Master Database Triggers:</label>
        
        <!-- The Tag Input Container -->
        <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; margin-top: 8px; margin-bottom: 20px; min-height: 80px;">
            <div id="tags_container" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 8px;"></div>
            <input id="new_tag_input" type="text" placeholder="Type a custom trigger word and press Enter..." style="width: 100%; background: transparent; color: #e4e4e7; border: none; outline: none; font-family: monospace; font-size: 13px;" />
        </div>

        <div style="display:flex; justify-content: flex-end; gap: 12px;">
            <button id="close_btn" style="padding: 10px 20px; background: transparent; color: #a1a1aa; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; transition: 0.2s;">Cancel</button>
            <button id="save_btn" style="padding: 10px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: 0.2s;">Save Tags</button>
        </div>
    `;
    document.body.appendChild(dialog);
    dialog.showModal();

    const statusText = dialog.querySelector("#status_text");
    const tagsContainer = dialog.querySelector("#tags_container");
    const tagInput = dialog.querySelector("#new_tag_input");

    // Renders the bubbles based on current state
    function renderTags() {
        tagsContainer.innerHTML = "";
        
        // 1. Locked Civitai Tags (Green)
        civitaiWords.forEach(tag => {
            const bubble = document.createElement("span");
            bubble.style.cssText = "background: rgba(52, 211, 153, 0.15); color: #34d399; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-family: monospace; border: 1px solid rgba(52, 211, 153, 0.3); display: inline-flex; align-items: center; user-select: none;";
            bubble.innerText = tag;
            bubble.title = "Automatically fetched from Civitai (Locked)";
            tagsContainer.appendChild(bubble);
        });

        // 2. Custom Tags (Blue, Removable)
        customWords.forEach((tag, index) => {
            const bubble = document.createElement("span");
            bubble.style.cssText = "background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 4px 8px 4px 10px; border-radius: 12px; font-size: 12px; font-family: monospace; border: 1px solid rgba(59, 130, 246, 0.3); display: inline-flex; align-items: center; gap: 6px;";
            bubble.innerText = tag;
            
            const removeBtn = document.createElement("span");
            removeBtn.innerText = "✕";
            removeBtn.style.cssText = "cursor: pointer; color: #93c5fd; font-weight: bold; padding: 0 2px; font-size: 10px;";
            removeBtn.onclick = () => {
                customWords.splice(index, 1);
                renderTags();
            };
            
            bubble.appendChild(removeBtn);
            tagsContainer.appendChild(bubble);
        });

        if (civitaiWords.length === 0 && customWords.length === 0) {
            tagsContainer.innerHTML = `<span style="color: #71717a; font-size: 12px; font-style: italic;">No tags yet. Add one below.</span>`;
        }
    }

    // Render initially (so your manually saved tags show up right away)
    renderTags();

    // Handle typing a new tag
    tagInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = tagInput.value.trim();
            if (val) {
                // Split by comma if the user pasted a list
                const newTags = val.split(",").map(t => t.trim()).filter(t => t);
                newTags.forEach(t => {
                    // Prevent duplicates
                    if (!civitaiWords.includes(t) && !customWords.includes(t)) {
                        customWords.push(t);
                    }
                });
                tagInput.value = "";
                renderTags();
            }
        }
    });

    // Fetch Civitai Data
    try {
        const hashRes = await fetch(`/loratags/get_hash?lora_name=${encodeURIComponent(loraName)}`);
        const hashData = await hashRes.json();

        if (hashData.hash) {
            statusText.innerText = `Connecting to Civitai...`;
            const civitaiRes = await fetch(`https://civitai.com/api/v1/model-versions/by-hash/${hashData.hash}`);
            
            if (civitaiRes.ok) {
                const civitaiData = await civitaiRes.json();
                statusText.style.display = "none";
                dialog.querySelector("#civitai_content").style.display = "block";
                dialog.querySelector("#c_name").innerText = civitaiData.model?.name || civitaiData.name || "Unknown";
                
                if (civitaiData.trainedWords && civitaiData.trainedWords.length > 0) {
                    dialog.querySelector("#c_words_status").innerHTML = `<span style="color: #34d399;">Fetched successfully.</span>`;
                    civitaiWords = civitaiData.trainedWords;
                    // Remove any custom words that match the newly fetched Civitai words to avoid duplicates
                    customWords = customWords.filter(w => !civitaiWords.includes(w));
                    renderTags();
                } else {
                    dialog.querySelector("#c_words_status").innerText = "None found on Civitai";
                }
                
                const imgContainer = dialog.querySelector("#c_images");
                if (civitaiData.images && civitaiData.images.length > 0) {
                    civitaiData.images.slice(0, 4).forEach(img => {
                        const imgEl = document.createElement("img");
                        imgEl.src = img.url;
                        imgEl.style.cssText = "height: 250px; border-radius: 6px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
                        imgContainer.appendChild(imgEl);
                    });
                }
            } else {
                statusText.innerText = "Model not found on Civitai (or API limits reached).";
            }
        }
    } catch (e) {
        statusText.innerText = "Error fetching data from the server or Civitai.";
    }

    dialog.querySelector("#close_btn").addEventListener("click", () => {
        dialog.close();
        dialog.remove();
    });

    dialog.querySelector("#save_btn").addEventListener("click", async () => {
        // Combine all active bubbles into a single comma-separated string
        const finalTags = [...new Set([...civitaiWords, ...customWords])].join(", ");
        
        await fetch("/loratags/save_tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lora_name: loraName, tags: finalTags })
        });
        
        if(onSaveCallback) onSaveCallback();

        dialog.close();
        dialog.remove();
    });
}
