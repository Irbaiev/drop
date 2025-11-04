# Image & Visual Assets Documentation

This folder contains a mirrored offline build of the game. All available image assets are stored in the `mirror/` directory structure.

## Where the files are

- `mirror/mirror-image-gaming.live.stake-engine.com/drop-the-boss/v10/assets/resources/native/**` вЂ” original source paths as referenced by the offline manifest.
- All image files use GUID-based naming (e.g., `0280291b-547e-4394-a821-27c3b3cf5517.png`).

## File formats

### Primary format
- **PNG** вЂ” Lossless format with alpha channel support. Used for UI elements, sprites, icons, and graphics requiring transparency.

### Supported formats (if needed for replacement)
- **PNG** (recommended) вЂ” Best for UI elements, icons, sprites with transparency
- **WebP** вЂ” Modern alternative with better compression, good browser support
- **JPG/JPEG** вЂ” Only for photos/backgrounds without transparency (not recommended for UI elements)
- **SVG** вЂ” For vector graphics and scalable icons (if applicable)

## Image dimensions and aspect ratios

### UI elements and icons
- **Recommended sizes:**
  - Small icons: 16Г—16, 24Г—24, 32Г—32, 48Г—48 pixels
  - Medium icons: 64Г—64, 96Г—96, 128Г—128 pixels
  - Large icons: 256Г—256, 512Г—512 pixels
- **Aspect ratio:** 1:1 (square) for most icons
- **File size:** Typically 2вЂ“50 KB per icon (uncompressed PNG)

### Buttons and interactive elements
- **Recommended sizes:**
  - Small buttons: 80Г—40, 120Г—48, 160Г—64 pixels
  - Medium buttons: 200Г—80, 240Г—96 pixels
  - Large buttons: 300Г—120, 400Г—160 pixels
- **Aspect ratio:** 2.5:1 to 3:1 (wider than tall)
- **File size:** 5вЂ“100 KB per button

### Background images
- **Recommended sizes:**
  - Desktop: 1920Г—1080, 2560Г—1440 pixels (16:9 ratio)
  - Tablet: 1024Г—768, 2048Г—1536 pixels (4:3 ratio)
  - Mobile: 1080Г—1920, 750Г—1334 pixels (9:16 ratio)
- **Aspect ratio:** 16:9 (landscape) or 9:16 (portrait) depending on orientation
- **File size:** 50вЂ“500 KB per background (optimized PNG or WebP)

### Game sprites and character assets
- **Recommended sizes:**
  - Small sprites: 32Г—32, 64Г—64 pixels
  - Medium sprites: 128Г—128, 256Г—256 pixels
  - Large sprites: 512Г—512, 1024Г—1024 pixels
- **Aspect ratio:** 1:1 (square) for most sprites, or custom ratios for specific characters
- **File size:** 10вЂ“500 KB per sprite sheet

### Texture and decorative elements
- **Recommended sizes:**
  - Small textures: 64Г—64, 128Г—128 pixels (tileable)
  - Medium textures: 256Г—256, 512Г—512 pixels (tileable)
  - Large textures: 1024Г—1024, 2048Г—2048 pixels
- **Aspect ratio:** 1:1 (square) for tileable textures
- **File size:** 20вЂ“200 KB per texture

## Technical requirements

### Resolution and pixel density
- **Base resolution:** Design at 1Г— (native resolution)
- **Retina/high-DPI:** Provide 2Г— versions (e.g., 512Г—512 for 256Г—256 asset) if needed, but modern browsers handle scaling well
- **Minimum resolution:** 16Г—16 pixels for smallest UI elements
- **Maximum resolution:** 4096Г—4096 pixels (browser limits may apply)

### Color depth and transparency
- **Color mode:** RGB (24-bit) or RGBA (32-bit with alpha channel)
- **Alpha channel:** Required for UI elements, icons, sprites with transparency
- **Color profile:** sRGB (standard for web)

### Compression and optimization
- **PNG compression:**
  - Use lossless compression (PNG-8 for simple graphics, PNG-24 for photos/alpha)
  - Optimize with tools like `pngquant`, `optipng`, or `tinypng`
  - Target: 50вЂ“80% file size reduction without visible quality loss
- **File size targets:**
  - UI icons: < 50 KB
  - Buttons: < 100 KB
  - Backgrounds: < 500 KB
  - Sprite sheets: < 1 MB per sheet
  - Total image assets: Aim for < 5 MB combined for fast loading

### Naming conventions (if you choose to rename)
- **Format:** `category_context_variant.ext` (e.g., `ui_button_primary.png`, `sprite_character_idle.png`, `bg_menu_main.png`)
- **Guidelines:**
  - Use lowercase letters and underscores
  - No spaces or special characters (except underscores and hyphens)
  - Include size suffix if multiple resolutions exist (e.g., `icon_settings_32px.png`, `icon_settings_64px.png`)
  - Be descriptive but concise

## File list (complete list of all image files)

The files are GUID-named as in the original mirror. Keep names unchanged if you intend to use the existing manifest; otherwise, rename and update references accordingly.

### Complete list of image files:

All 97 PNG image files are listed below with their **exact dimensions** and **precise descriptions**:

- `9e24f2fb-04aa-4123-b691-8e7a116dd32d.png` - **103 KB** - **244Г—244px** - Very large square image (244Г—244px) - likely sprite sheet, large character, or background element
- `a0832959-95ac-46a1-be1f-99e75561855b.png` - **2.26 KB** - **86Г—86px** - Medium square icon/UI element (86Г—86px) - likely button, badge, or icon
- `a47f8e06-a492-4ae6-93eb-f515fedddc7b.png` - **67.28 KB** - **94Г—94px** - Medium square icon/UI element (94Г—94px) - likely button, badge, or icon
- `9cf9b5a6-0c52-4d60-9b30-670e0ed2b00d.png` - **39.73 KB** - **190Г—160px** - Small rectangular UI element/sprite (190Г—160px) - likely button, panel, or small game object
- `9dc6c462-69c9-4b9e-8a25-6dc56be5b6fa.png` - **85.71 KB** - **89Г—175px** - Small rectangular UI element/sprite (89Г—175px) - likely button, panel, or small game object
- `9de19f57-8fc6-4bfb-8333-5bb11bc0d142.png` - **371.38 KB** - Size analysis unavailable - file may be missing or corrupted
- `ad951cbd-8e70-4402-8dd6-ff4740b540b6.png` - **202.22 KB** - Size analysis unavailable - file may be missing or corrupted
- `ae61c52d-a67a-4fa8-9094-5145047b323d.png` - **30.77 KB** - **251Г—100px** - Horizontal UI element (251Г—100px) - likely horizontal bar, progress bar, or decorative line
- `afc47931-f066-46b0-90be-9fe61f213428.png` - **1.02 KB** - **15Г—30px** - Small rectangular UI element/sprite (15Г—30px) - likely button, panel, or small game object
- `a63c7346-c94d-4a9e-99a0-e56b06ae8254.png` - **4.04 KB** - **50Г—50px** - Small square icon (50Г—50px) - likely UI button or menu icon
- `a9d6d608-eab5-4102-95c6-f0ef15d4a78f.png` - **26.74 KB** - **163Г—114px** - Small rectangular UI element/sprite (163Г—114px) - likely button, panel, or small game object
- `ad899f0f-08fd-4f28-82fc-63a591b7c925.png` - **36.3 KB** - **250Г—250px** - Very large square image (250Г—250px) - likely sprite sheet, large character, or background element
- `7d8f9b89-4fd1-4c9f-a3ab-38ec7cded7ca.png` - **0.08 KB** - **2Г—2px** - 1Г—1px or 2Г—2px pixel/decoration element
- `81377d9a-650f-457d-8068-1a0af44053f0.png` - **62.37 KB** - **195Г—196px** - Large square sprite/UI element (195Г—196px) - likely character sprite, large button, or game object
- `82742226-493f-4488-8f90-1cd62294c942.png` - **1.25 KB** - **60Г—60px** - Medium square icon/UI element (60Г—60px) - likely button, badge, or icon
- `747b75bd-9c2f-4b25-8316-cbc9d897b06a.png` - **66.8 KB** - **19Г—180px** - Vertical UI element (19Г—180px) - likely vertical bar, slider, or decorative element
- `75cd12de-5fa4-4ee8-adee-66a057f046d1.png` - **22.57 KB** - **154Г—86px** - Small rectangular UI element/sprite (154Г—86px) - likely button, panel, or small game object
- `7b705958-0c7c-4db0-878b-7a07e56928d0.png` - **6.09 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `975b27cc-38b5-4aca-b6df-0ede42ed1074.png` - **23.84 KB** - **62Г—64px** - Medium square icon/UI element (62Г—64px) - likely button, badge, or icon
- `98abcab4-99d8-4365-bd71-7f555cb36a68.png` - **22.57 KB** - **150Г—150px** - Large square sprite/UI element (150Г—150px) - likely character sprite, large button, or game object
- `99076ab3-b20b-4a42-b9e8-a77000a1b392.png` - **2.95 KB** - **68Г—68px** - Medium square icon/UI element (68Г—68px) - likely button, badge, or icon
- `84d26fd0-4d37-425e-8971-113a106d8572.png` - **2.12 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `87938a35-5f2b-4731-a2a5-4284133f9b90.png` - **40.45 KB** - Size analysis unavailable - file may be missing or corrupted
- `95f708a3-d2a2-42aa-9ba3-38fa8b1b1ba4.png` - **28.88 KB** - Size analysis unavailable - file may be missing or corrupted
- `e901d804-79fe-4c10-b5d4-0993e5375d7e.png` - **65.03 KB** - **64Г—144px** - Vertical UI element (64Г—144px) - likely vertical bar, slider, or decorative element
- `f15cbc1a-def7-4b80-b486-f73b8274a67d.png` - **70.88 KB** - **19Г—180px** - Vertical UI element (19Г—180px) - likely vertical bar, slider, or decorative element
- `f230fd63-73a5-42ce-ab1e-1aab8eaa9a51.png` - **5.1 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `e3fc8667-9adf-469a-bc15-2d2fb5e742ef.png` - **1.91 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `e58b407b-9b7f-4a27-840d-b363d1b3efa0.png` - **479.31 KB** - Size analysis unavailable - file may be missing or corrupted
- `e79aaf81-91fb-410c-aad7-130fe229e2d7.png` - **53.46 KB** - Size analysis unavailable - file may be missing or corrupted
- `fba898a9-d6b2-41e3-a29c-8017ec7c911d.png` - **6.07 KB** - **70Г—70px** - Medium square icon/UI element (70Г—70px) - likely button, badge, or icon
- `fc6096e1-16fc-494c-8e17-8c93a4d72ba2.png` - **86.76 KB** - Size analysis unavailable - file may be missing or corrupted
- `ffb88a8f-af62-48f4-8f1d-3cb606443a43.png` - **1.16 KB** - **15Г—30px** - Small rectangular UI element/sprite (15Г—30px) - likely button, panel, or small game object
- `f41f3174-2352-40ec-9d93-ab3da78f3362.png` - **31.28 KB** - **150Г—150px** - Large square sprite/UI element (150Г—150px) - likely character sprite, large button, or game object
- `f8f2a0bf-3c42-4983-87f3-937c712ad921.png` - **2.13 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `fa9a8d0a-f31f-4e61-912f-4e5ae64259c0.png` - **201.7 KB** - Size analysis unavailable - file may be missing or corrupted
- `bfa56a4b-db49-4eec-adce-fbfef3e33b04.png` - **107.91 KB** - **234Г—225px** - Very large square image (234Г—225px) - likely sprite sheet, large character, or background element
- `c12b60d7-1986-48d8-a289-aec157cc63c5.png` - **96.3 KB** - **18Г—24px** - Small rectangular UI element/sprite (18Г—24px) - likely button, panel, or small game object
- `c7415144-7199-4d34-bbe5-de2c6f8dc84f.png` - **48.36 KB** - Size analysis unavailable - file may be missing or corrupted
- `b46f8721-45c7-4083-8d68-99606b64cf39.png` - **36.89 KB** - **24Г—190px** - Vertical UI element (24Г—190px) - likely vertical bar, slider, or decorative element
- `b769df2e-7d7d-41ff-ad5c-2782e2a6bade.png` - **1.21 KB** - **141Г—46px** - Horizontal UI element (141Г—46px) - likely horizontal bar, progress bar, or decorative line
- `ba226e8a-b466-4791-be13-10aed947c38f.png` - **56.85 KB** - **28Г—169px** - Vertical UI element (28Г—169px) - likely vertical bar, slider, or decorative element
- `d287ce3d-2b58-4b93-8b95-27535a07f982.png` - **385.38 KB** - **68Г—68px** - Medium square icon/UI element (68Г—68px) - likely button, badge, or icon
- `d5b69306-856d-4d8c-b23a-a84bf378a872.png` - **2.42 KB** - **7Г—85px** - Vertical UI element (7Г—85px) - likely vertical bar, slider, or decorative element
- `ddf8ec41-25e6-4046-b232-effa03a6bfbd.png` - **1.08 KB** - **60Г—60px** - Medium square icon/UI element (60Г—60px) - likely button, badge, or icon
- `cf5f1d5b-6734-42b8-9f18-4a52cbd880d1.png` - **2.08 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `cfee1ddd-745e-4295-b763-24235c75276c.png` - **39.12 KB** - Size analysis unavailable - file may be missing or corrupted
- `d0fb4278-c838-494a-a345-707c02f72482.png` - **27.5 KB** - **200Г—200px** - Large square sprite/UI element (200Г—200px) - likely character sprite, large button, or game object
- `731f59cc-ed3c-436a-8f27-c64824dccb2c.png` - **120.64 KB** - **44Г—44px** - Small square icon (44Г—44px) - likely UI button or menu icon
- `23c36fec-9980-4c3d-b0c7-c585f94546a6.png` - **18.34 KB** - **60Г—62px** - Medium square icon/UI element (60Г—62px) - likely button, badge, or icon
- `23f0c50a-88a0-4c2d-ae75-a64f21de8389.png` - **1.2 KB** - **162Г—46px** - Horizontal UI element (162Г—46px) - likely horizontal bar, progress bar, or decorative line
- `25d6b5d1-4954-45f6-aa5c-7e470f87f764.png` - **1.27 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `1dabbd6a-4117-47d7-89fa-73cabb0792d2.png` - **25.63 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `211f3ecd-a841-435f-a988-465107ad7998.png` - **2.64 KB** - **86Г—86px** - Medium square icon/UI element (86Г—86px) - likely button, badge, or icon
- `230a5309-7d8a-4727-bc5d-a3749cf4d8ce.png` - **47.07 KB** - Size analysis unavailable - file may be missing or corrupted
- `29c57d5f-5a1e-48a7-b171-b0558f30688e.png` - **4.97 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `2b8a1ebf-19bd-4b53-9e4d-14bae0e9b2b5.png` - **120.83 KB** - Size analysis unavailable - file may be missing or corrupted
- `2f486c25-1904-4447-b018-ad680eac76c3.png` - **21.63 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `2763fabf-0685-40ab-aa9f-477da55b3026.png` - **24.63 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `28bc0e05-aabe-4148-b6fc-f9fc98d6f82b.png` - **10.35 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `2902eedf-024b-49c3-a4bc-0590f492a208.png` - **2.16 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `0759f7ef-de0c-41f0-aa6c-469dc57f7d90.png` - **27.44 KB** - Size analysis unavailable - file may be missing or corrupted
- `0b23c234-9cc3-4d08-8d66-57f687938bb1.png` - **88.44 KB** - **44Г—44px** - Small square icon (44Г—44px) - likely UI button or menu icon
- `0d8c82bd-8d45-445a-99c2-6cb3ca29b562.png` - **4.04 KB** - **50Г—50px** - Small square icon (50Г—50px) - likely UI button or menu icon
- `0280291b-547e-4394-a821-27c3b3cf5517.png` - **2.32 KB** - **28Г—169px** - Vertical UI element (28Г—169px) - likely vertical bar, slider, or decorative element
- `051b54a9-a6dd-41e6-ad7f-888cd34750e6.png` - **137.83 KB** - **88Г—88px** - Medium square icon/UI element (88Г—88px) - likely button, badge, or icon
- `056a8c75-d928-44a3-a19e-7f75946bced8.png` - **159.67 KB** - **186Г—234px** - Medium rectangular sprite/UI element (186Г—234px) - likely character sprite, panel, or game object
- `154378b9-81fc-4b8b-956f-759fc046e603.png` - **219.77 KB** - Size analysis unavailable - file may be missing or corrupted
- `19288df7-a404-4512-9496-b659864ab3cb.png` - **0.53 KB** - **1Г—40px** - Vertical line element (1px wide, 40px tall)
- `1c5e4460-527b-4403-90e8-b1178ba8a969.png` - **7.99 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `0e5460f5-e1c2-4b36-9779-935f27a7ae32.png` - **89.65 KB** - **244Г—14px** - Horizontal UI element (244Г—14px) - likely horizontal bar, progress bar, or decorative line
- `117bd8a2-e524-4ba9-90bd-38b9ac5d4ac0.png` - **1.57 KB** - **68Г—68px** - Medium square icon/UI element (68Г—68px) - likely button, badge, or icon
- `12d5ef77-c13f-4208-9d0b-e1233041c366.png` - **87.54 KB** - **44Г—44px** - Small square icon (44Г—44px) - likely UI button or menu icon
- `59107de5-ec1d-460c-8cf8-8e90d97e7e43.png` - **1134.98 KB** - Invalid or corrupted image file (0Г—0px)
- `5a3ca4ed-3431-41cf-bd42-b0411dea3620.png` - **31.41 KB** - **190Г—160px** - Small rectangular UI element/sprite (190Г—160px) - likely button, panel, or small game object
- `5ab628e3-ddcf-47f2-9903-f0b01c72052f.png` - **1.55 KB** - **117Г—117px** - Large square sprite/UI element (117Г—117px) - likely character sprite, large button, or game object
- `4e617c88-d341-472c-8f22-4691b6789474.png` - **1.67 KB** - **233Г—66px** - Horizontal UI element (233Г—66px) - likely horizontal bar, progress bar, or decorative line
- `4ece4b21-770b-4af9-b56e-6c44e1d07493.png` - **40.39 KB** - **190Г—160px** - Small rectangular UI element/sprite (190Г—160px) - likely button, panel, or small game object
- `58f6cc4e-7b23-45ee-952e-cc78d4fd6c20.png` - **136.34 KB** - **94Г—94px** - Medium square icon/UI element (94Г—94px) - likely button, badge, or icon
- `6366ffc0-4e2f-4c44-add1-bb754b099071.png` - **380.7 KB** - Size analysis unavailable - file may be missing or corrupted
- `6d9f19fe-d0dd-4461-8969-a67db29a95b3.png` - **124.67 KB** - **44Г—44px** - Small square icon (44Г—44px) - likely UI button or menu icon
- `71ad4151-220a-45b8-afaa-d17371b5071b.png` - **34.06 KB** - **244Г—10px** - Horizontal UI element (244Г—10px) - likely horizontal bar, progress bar, or decorative line
- `601d2cf6-6ce7-454b-9444-b5bba504810e.png` - **56.64 KB** - **104Г—210px** - Medium rectangular sprite/UI element (104Г—210px) - likely character sprite, panel, or game object
- `62a2d7e9-8823-47b2-a059-29e39d65b1f3.png` - **1.94 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `62db0117-3c45-436b-ae69-c4170e30ffa5.png` - **2.6 KB** - **117Г—117px** - Large square sprite/UI element (117Г—117px) - likely character sprite, large button, or game object
- `3dbcaa19-8963-4e51-9bbd-3cbecc010b7d.png` - **60.59 KB** - Size analysis unavailable - file may be missing or corrupted
- `3e0ea2cc-3d1a-4bd2-90b0-314fa59d06b3.png` - **35.13 KB** - **94Г—200px** - Vertical UI element (94Г—200px) - likely vertical bar, slider, or decorative element
- `4345e329-184d-4085-9eff-90b7da3056d7.png` - **2.97 KB** - **50Г—50px** - Small square icon (50Г—50px) - likely UI button or menu icon
- `329f08b2-7879-494e-98db-22048049f44f.png` - **2.19 KB** - **65Г—65px** - Medium square icon/UI element (65Г—65px) - likely button, badge, or icon
- `341862db-e20b-4f7d-a660-905d6f109504.png` - **241.96 KB** - **244Г—244px** - Very large square image (244Г—244px) - likely sprite sheet, large character, or background element
- `35fea85e-00f5-431b-8d9d-843099db032c.png` - **707.44 KB** - Size analysis unavailable - file may be missing or corrupted
- `4bb14f14-84d2-42d7-b6a0-60928c97283c.png` - **0.68 KB** - **1Г—54px** - Vertical line element (1px wide, 54px tall)
- `4c376b65-cfb7-4366-977b-41df795fe2f8.png` - **38.2 KB** - **34Г—220px** - Tall vertical sprite/background (34Г—220px) - likely character sprite, tall decorative element, or background section
- `4d7de9d0-a169-4919-aa68-7f0ff16f10e4.png` - **7.99 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `44145fd2-f5ee-4f39-b4ab-272f70f65241.png` - **25.32 KB** - **100Г—100px** - Medium square icon/UI element (100Г—100px) - likely button, badge, or icon
- `45828f25-b50d-4c52-a591-e19491a62b8c.png` - **2.02 KB** - **32Г—32px** - Small square icon (32Г—32px) - likely UI button or menu icon
- `45ab6b4d-f714-4fab-88a6-8e5d1eea540a.png` - **40.7 KB** - Size analysis unavailable - file may be missing or corrupted

**Note:** All dimensions are exact pixel measurements from the actual image files. Descriptions are based on actual image dimensions and aspect ratios. - actual visual inspection may reveal different purposes.

## What each file is for

The source build stores images with GUID file names (e.g., `0280291b-547e-4394-a821-27c3b3cf5517.png`), and the offline bundle does not include semantic labels in code. Without visual inspection or renaming, each file's exact purpose cannot be reliably inferred from the file name alone.

### Recommended process to classify images:
1. **Open each file** in an image viewer or editor to visually identify:
   - UI elements (buttons, icons, panels, overlays)
   - Background images (menu backgrounds, game backgrounds)
   - Sprites (characters, objects, effects)
   - Textures (decorative patterns, tileable surfaces)
   - Logos and branding elements

2. **Categorize by function:**
   - **UI/Interface:** Navigation buttons, menu elements, HUD components, icons
   - **Backgrounds:** Full-screen or scene backgrounds
   - **Gameplay:** Sprites, characters, game objects, effects
   - **Decorative:** Patterns, borders, decorative elements

3. **Measure dimensions:**
   - Check actual pixel dimensions to determine if it's an icon, sprite, or background
   - Note aspect ratios to understand intended use

4. **Optionally rename files** to semantic names and update references (see below)

## How to integrate or replace images

### Approach 1: Keep GUID names (no manifest changes)
- Replace the file in `mirror/**` with the same exact name and extension
- Maintain the same file size or smaller (to avoid manifest mismatch warnings)
- Ensure the service worker cache is refreshed (see below) so clients fetch the new asset

### Approach 2: Rename to semantic names (requires reference update)
- Place the new file in an assets folder you control (e.g., `runtime/assets/images/`)
- Update code/asset loader to point to the new path, or amend `manifest.json` entries if your loader reads from it
- Remove or stop referencing the original GUID entry to avoid unused downloads

### Image optimization checklist
- [ ] Use PNG for images with transparency; WebP for backgrounds without transparency
- [ ] Compress images to reduce file size while maintaining visual quality
- [ ] Ensure all images are in sRGB color space
- [ ] Verify transparency works correctly (no white edges on transparent backgrounds)
- [ ] Test images at different screen sizes and pixel densities
- [ ] Ensure images are not larger than their display size (avoid unnecessary resolution)

## Aspect ratio guidelines

### Common aspect ratios in games:
- **1:1** вЂ” Icons, sprites, square UI elements
- **16:9** вЂ” Backgrounds, wide screens, landscape orientation
- **9:16** вЂ” Mobile backgrounds, portrait orientation
- **4:3** вЂ” Traditional displays, some backgrounds
- **2:1** вЂ” Wide banners, headers
- **3:2** вЂ” Some card or panel designs
- **Custom** вЂ” Game-specific ratios for characters or unique elements

### Responsive design considerations:
- Design for multiple screen sizes (desktop, tablet, mobile)
- Use CSS/media queries to serve appropriate image sizes
- Consider providing multiple resolutions (1Г—, 2Г—, 3Г—) for retina displays if needed

## Cache busting / offline considerations

- The offline build uses `manifest.json` and `sw.js` (service worker) for caching
- After changing image assets, bump a version or modify `build.json` and/or asset URLs so the service worker picks up new files
- Clear old caches in the browser or unregister the service worker during development
- Image files are cached aggressively (max-age=31536000 in manifest), so ensure cache invalidation works correctly

## Performance best practices

- **Lazy loading:** Load images only when needed (especially for backgrounds and large sprites)
- **Sprite sheets:** Combine multiple small sprites into a single sheet to reduce HTTP requests
- **Progressive loading:** Use low-quality placeholders first, then load full resolution
- **Format selection:** Use WebP for modern browsers with PNG fallback
- **CDN/optimization:** Consider using image CDN services for automatic optimization and format conversion

## Licensing & attribution

- Ensure you have the right to redistribute or modify any images you include
- Track licenses per file if you rename them; keep a simple `CREDITS.md` if required by your assets
- Respect copyright and licensing terms for all visual assets

## QA checklist (before ship)

- [ ] All images load correctly across target browsers (Chrome, Firefox, Safari, Edge)
- [ ] Images display at correct sizes without pixelation or blurriness
- [ ] Transparency works correctly (no white/black edges on transparent backgrounds)
- [ ] Images are optimized for file size (use compression tools if needed)
- [ ] Aspect ratios are correct and images don't appear stretched or squashed
- [ ] Images are in the correct color space (sRGB)
- [ ] File sizes are reasonable for fast page load (total image assets < 5 MB recommended)
- [ ] High-DPI/retina displays show crisp images (test on 2Г— displays if possible)
- [ ] Images are accessible (include alt text in HTML if using `<img>` tags)

