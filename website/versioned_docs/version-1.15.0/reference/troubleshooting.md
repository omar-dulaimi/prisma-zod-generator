---
id: troubleshooting
title: Troubleshooting
---

| Symptom                | Likely Cause                                                        | Fix                                                   |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Output path unexpected | JSON config `output` ignored due to explicit generator block output | Remove block `output` or align paths                  |
| Missing model schemas  | Model disabled (minimal mode default)                               | Add model config or switch mode                       |
| Missing variant files  | `emit.variants=false` or single-file mode                           | Enable flag / disable single-file                     |
| Enum reference errors  | `emit.enums=false`                                                  | Enable enums or remove enum fields                    |
| Nested inputs missing  | Minimal mode pruning                                                | Switch to full/custom or explicitly enable operations |
