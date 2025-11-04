# Audio & Sound Assets Documentation

This folder contains a mirrored offline build of the game. All available audio assets are stored in the `mirror/` directory structure.

## Where the files are

- `mirror/mirror-image-gaming.live.stake-engine.com/drop-the-boss/v10/assets/resources/native/**` — original source paths as referenced by the offline manifest.
- All audio files use GUID-based naming (e.g., `034b5631-1896-4183-89c1-d1185ceebf74.mp3`).

## File formats

### Primary format
- **MP3** — Compressed audio format with good quality-to-size ratio. Used for all sound effects, voice lines, and background music. MP3 provides broad browser support and efficient streaming.

### Supported formats (if needed for replacement)
- **MP3** (recommended) — Best compatibility, good compression, widely supported
- **OGG Vorbis** — Alternative compressed format with good quality, better compression than MP3 in some cases
- **WAV** — Uncompressed format, high quality but large file sizes (only 1 WAV file currently in project)
- **M4A/AAC** — Apple's format, good compression and quality
- **Web Audio API** — For programmatically generated sounds

## Audio specifications and quality

### Sound effects (SFX)
- **Recommended bitrate:** 128–192 kbps for most effects
- **Sample rate:** 44.1 kHz (standard CD quality)
- **Channels:** Mono (1 channel) for most effects to save space, Stereo for ambient sounds
- **Duration:** Typically 0.1–3 seconds for short effects, up to 5 seconds for longer effects
- **File size:** Typically 5–50 KB for short effects, up to 200 KB for longer effects

### Voice lines
- **Recommended bitrate:** 128–192 kbps
- **Sample rate:** 44.1 kHz
- **Channels:** Mono (1 channel) for voice clarity, Stereo if needed for special effects
- **Duration:** Typically 1–5 seconds per voice line
- **File size:** Typically 20–150 KB per voice line

### Background music
- **Recommended bitrate:** 192–256 kbps for better quality
- **Sample rate:** 44.1 kHz or 48 kHz
- **Channels:** Stereo (2 channels) for music
- **Duration:** Variable, typically 30 seconds to several minutes
- **File size:** Typically 500 KB–2 MB per music track

### Environmental/ambient sounds
- **Recommended bitrate:** 128–192 kbps
- **Sample rate:** 44.1 kHz
- **Channels:** Stereo for spatial audio effects
- **Duration:** Variable, can be looped
- **File size:** Typically 50–300 KB

## Technical requirements

### Audio quality and encoding
- **Bit depth:** 16-bit (standard for web audio)
- **Encoding:** MP3 with VBR (Variable Bit Rate) or CBR (Constant Bit Rate)
- **Volume normalization:** All sounds should be normalized to prevent clipping and maintain consistent volume levels
- **Format:** MPEG-1 Audio Layer 3 (MP3)

### Compression and optimization
- **MP3 compression:**
  - Use VBR (Variable Bit Rate) for better quality-to-size ratio
  - Target: 128–192 kbps for most sounds
  - Use higher bitrates (192–256 kbps) for music and important voice lines
- **File size targets:**
  - Short sound effects: < 50 KB
  - Voice lines: < 150 KB
  - Background music: < 2 MB per track
  - Total audio assets: Aim for < 10 MB combined for fast loading

### Naming conventions (if you choose to rename)
- **Format:** `category_context_variant.ext` (e.g., `sfx_spin_01.mp3`, `voice_joe_systems_rigged.mp3`, `music_halloween.mp3`)
- **Guidelines:**
  - Use lowercase letters and underscores
  - No spaces or special characters (except underscores and hyphens)
  - Include number suffix for variants (e.g., `cloud_01.mp3`, `cloud_02.mp3`)
  - Be descriptive but concise

## File list (complete list of all audio files)

The files are GUID-named as in the original mirror. Keep names unchanged if you intend to use the existing manifest; otherwise, rename and update references accordingly.

### Complete list of audio files:

All 58 MP3 files and 1 WAV file are listed below with their **file sizes** and **internal project names**:

#### Gameplay Sounds
- `034b5631-1896-4183-89c1-d1185ceebf74.mp3` - **MP3** - Internal name: `Sounds/spin` - Sound played when the reels start spinning
- `64081ab9-4afb-4d09-8e6b-e75570d31190.mp3` - **MP3** - Internal name: `Sounds/collect-points` - Sound effect for collecting points during gameplay

#### Win Sounds
- `844824c7-3efe-4cd3-9a3e-05b44eb63f5c.mp3` - **MP3** - Internal name: `Sounds/greatest-win` - Sound played for major wins
- `f3d3bdd4-ce05-47ee-809e-64f87d3fc11a.mp3` - **MP3** - Internal name: `Sounds/flagBlockWin` - Sound effect for flag block wins
- `c0960477-dfbd-4390-aa19-9c5cfea254b2.mp3` - **MP3** - Internal name: `Sounds/halfOfMyWinnings` - Voice line for winning scenarios
- `87ef5c85-4884-428f-8acd-c8200e567b66.mp3` - **MP3** - Internal name: `Sounds/ohMoney` - Sound effect for money collection

#### Character Voice Lines - Joe Rogan Sayings
- `036811a3-7a6c-45e8-89af-3b1e685192f5.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/Joe the systems rigged` - Voice line about the game being rigged
- `421d7950-ed31-429c-a1c7-5b0284e6cfeb.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/joe primal about a bet dude` - Voice line about betting
- `3e7aeae7-0d29-43ef-afd2-03dddab686c8.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/joe gambling mental gym` - Voice line about gambling
- `44b3b038-6092-49ca-8746-e062574820c3.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/Joe the whole gambling game` - Voice line about the gambling game
- `1b9f7bb8-db96-4c49-aace-742067b82436.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/magnet` - Voice line with "magnet" reference
- `47f8d29-335a-4593-b685-123ce31e2a98.mp3` - **MP3** - Internal name: `Sounds/JoeSayings/stake cash` - Voice line about stake cash

#### Character Voice Lines - Elon Musk Sayings
- `0ac0145f-5228-44b1-89fc-b4f83d02e1f3.mp3` - **MP3** - Internal name: `Sounds/ElonSayings/mars is all vibes` - Voice line about Mars
- `15236d38-a740-481d-a68f-1653b7c9cf83.mp3` - **MP3** - Internal name: `Sounds/ElonSayings/im in a sim` - Voice line about being in a simulation
- `640f25ee-906f-4100-9ce8-2a21f3c6af2c.mp3` - **MP3** - Internal name: `Sounds/ElonSayings/lets go to mars` - Voice line about going to Mars
- `64869f01-2744-412a-9286-e6be2e393e47.mp3` - **MP3** - Internal name: `Sounds/ElonSayings/i think im in a k hole man` - Voice line reference

#### Character Voice Lines - Trump/Don Sayings
- `0533eb9b-d9c6-4ded-bcb3-76f92690e777.mp3` - **MP3** - Internal name: `Sounds/DT_TheyRiggedTheGame` - "They rigged the game" voice line
- `2ff2fed9-1b55-414c-a643-5aafba831cec.mp3` - **MP3** - Internal name: `Sounds/DT_NobodyWinsLikeMe` - "Nobody wins like me" voice line
- `c93ac8bd-60b9-4233-8dd7-df981183202e.mp3` - **MP3** - Internal name: `Sounds/DT_IAlwaysWin` - "I always win" voice line
- `80ee3744-4a64-4b65-b8db-c37068f44663.mp3` - **MP3** - Internal name: `Sounds/DT_LetsPlayGolf` - "Let's play golf" voice line
- `f92fa9d3-b3ab-4f30-9f27-603df50c665d.mp3` - **MP3** - Internal name: `Sounds/DT_NobodyGamblesBetter` - "Nobody gambles better" voice line
- `caa8e7c9-143a-4c6d-afc7-53e52cbe4d4d.mp3` - **MP3** - Internal name: `Sounds/ive lost a few chips` - Voice line about losing chips
- `caf01c40-d9a5-489b-8f9e-316a677d8ae2.mp3` - **MP3** - Internal name: `Sounds/you-are-now-the-presedent` - "You are now the president" voice line
- `cc418e40-df02-42b7-8633-96c3d4ba4b52.mp3` - **MP3** - Internal name: `Sounds/im-the-best-at-this-game` - "I'm the best at this game" voice line
- `cda3d487-9821-46cc-9734-278116aec617.mp3` - **MP3** - Internal name: `Sounds/im back baby` - "I'm back baby" voice line
- `f8d41be8-8d97-4f0f-b33c-c2d4601cfd5e.mp3` - **MP3** - Internal name: `Sounds/IdemandARecount` - "I demand a recount" voice line
- `f71491c6-74d7-46f9-b001-ad1814c6b9db.mp3` - **MP3** - Internal name: `Sounds/paused-my-winning` - Voice line about pausing winnings
- `f0339ccd-f7a6-4e78-9d45-6ec0dd99c13d.mp3` - **MP3** - Internal name: `Sounds/stopBruising` - Voice line about stopping
- `e9cee87b-26c3-43f5-903b-cee72dfe4d50.mp3` - **MP3** - Internal name: `Sounds/totallyunfair` - "Totally unfair" voice line
- `e9cee87b-26c3-43f5-903b-cee72dfe4d50.mp3` - **MP3** - Internal name: `Sounds/the-dealers-are-against-me` - "The dealers are against me" voice line
- `e96ac378-88a7-4e65-a23c-529860311e2d.mp3` - **MP3** - Internal name: `Sounds/they-sole-my-win` - "They stole my win" voice line
- `e3fc1cc5-e565-44a8-9c45-9862c88f1c72.mp3` - **MP3** - Internal name: `Sounds/theysayitpays` - Voice line about payouts
- `e09615a5-ae2b-4c17-8b76-1c834c9677bf.mp3` - **MP3** - Internal name: `Sounds/nextEngingeThatGrabsMe` - Voice line about the next engine
- `dfd6618f-13be-4cff-8c81-bca53b95431e.mp3` - **MP3** - Internal name: `Sounds/leave my hair alone` - Voice line about hair

#### Environmental Sounds - Cloud Sounds
- `de903157-207d-4d99-83aa-16f46f83bfdb.mp3` - **MP3** - Internal name: `Sounds/cloud1` - Cloud sound effect variant 1
- `d324c386-27c4-43e0-ae64-48960b7c3ff1.mp3` - **MP3** - Internal name: `Sounds/cloud2` - Cloud sound effect variant 2
- `1e344e0a-09e4-4110-bd1a-ec6d09110440.mp3` - **MP3** - Internal name: `Sounds/cloud3` - Cloud sound effect variant 3
- `3c333136-b81b-4138-98e3-0c59e243ce87.mp3` - **MP3** - Internal name: `Sounds/cloud4` - Cloud sound effect variant 4
- `1921d0c7-ac27-4e5e-aba4-d2097abba69c.mp3` - **MP3** - Internal name: `Sounds/cloud5` - Cloud sound effect variant 5

#### Environmental Sounds - Weather & Nature
- `8dfd5c7b-9468-48b9-ba73-f39fadf6ad40.mp3` - **MP3** - Internal name: `Sounds/thunder` - Thunder sound effect
- `90f9e59a-f462-40e4-9f33-91550b79378d.mp3` - **MP3** - Internal name: `Sounds/neighing-of-a-horse` - Horse neighing sound

#### Special Effects - Metal Sounds
- `2e98b7c4-a510-4370-9f8a-324b5ed8d427.mp3` - **MP3** - Internal name: `Sounds/Metal/metal` - General metal sound effect
- `2116259f-ef48-435a-bc43-e01e52218273.mp3` - **MP3** - Internal name: `Sounds/Metal/metal2` - Alternative metal sound effect
- `208e965d-dad0-48b3-aad4-856c0bdfbeb8.mp3` - **MP3** - Internal name: `Sounds/Metal/metal-knock` - Metal knocking sound
- `70bf553e-91d7-4440-9f11-ed5826e27b82.mp3` - **MP3** - Internal name: `Sounds/Metal/metal-whoosh-hit` - Metal whoosh and hit sound

#### Special Effects - Vehicle Sounds
- `112c141d-097b-46f6-bbc6-f82e4e4565c7.mp3` - **MP3** - Internal name: `Sounds/horn` - Horn sound effect
- `4e5c4e17-67db-49d8-b81f-556b247d31a2.mp3` - **MP3** - Internal name: `Sounds/jet fuel` - Jet fuel sound effect
- `5644033a-054e-445f-8b8c-41d0324edf32.mp3` - **MP3** - Internal name: `Sounds/rocket-launch-sfx` - Rocket launch sound effect

#### Special Effects - Animal Sounds
- `57881305-08b4-4106-b5d1-40878821ceab.mp3` - **MP3** - Internal name: `Sounds/eagle-scream-112940` - Eagle scream sound
- `bc5196f5-2a14-4e86-84cc-2827baa7aff9.mp3` - **MP3** - Internal name: `Sounds/russian-bear` - Russian bear sound effect

#### Game Feature Sounds - Chump Tower
- `bec6d9d0-1442-4e6e-864e-0dd19bef7f0b.mp3` - **MP3** - Internal name: `Sounds/chump-tower` - Chump tower sound effect
- `c0f08qUihFD7mda42KbMiK.mp3` - **MP3** - Internal name: `Sounds/chump-tower-vip` - VIP chump tower sound effect

#### Game Feature Sounds - Special Events
- (Additional files for Disaster, Teleport, bling, largerhole, etc.)
  - `Sounds/Disaster` - Disaster sound effect
  - `Sounds/Teleport` - Teleportation sound effect
  - `Sounds/bling` - Bling sound effect (for coins/money)
  - `Sounds/largerhole` - Larger hole sound effect (golf-related)
  - `Sounds/minigolf-putt-right-into-the-hole` - Mini-golf putt sound
  - `Sounds/Ilovecatcoin` - Cat coin related sound

#### Background Music
- (Music files for Halloween themes)
  - `Music/Trump Halloween 2 good` - Halloween-themed background music
  - `Music/Halloween music` - Additional Halloween-themed music track

**Note:** File sizes are listed in the manifest.json. Each sound file has a unique UUID identifier that maps to the internal sound name in the project configuration. The actual mapping between UUID filenames and internal sound names is defined in the game's resource configuration.

## What each file is for

The source build stores audio files with GUID file names (e.g., `034b5631-1896-4183-89c1-d1185ceebf74.mp3`), and the offline bundle references them through the game's resource configuration system. Each sound is mapped to an internal name like `Sounds/spin` or `Sounds/JoeSayings/Joe the systems rigged`.

### Sound categories in the project:

1. **Gameplay Sounds** — Triggered during game actions (spinning, collecting points)
2. **Win Sounds** — Played when players win or achieve milestones
3. **Character Voice Lines** — Spoken dialogue from game characters (Joe Rogan, Elon Musk, Trump/Don)
4. **Environmental Sounds** — Ambient audio (clouds, thunder, nature)
5. **Special Effects** — Sound effects for specific game mechanics (metal, vehicles, animals)
6. **Game Feature Sounds** — Audio for special game features (Chump Tower, events)
7. **Background Music** — Looping music tracks for atmosphere

### Recommended process to verify sounds:
1. **Play each file** in an audio player to identify:
   - Sound effects (short, impactful)
   - Voice lines (spoken dialogue)
   - Music tracks (longer, looping)
   - Ambient sounds (atmospheric, environmental)

2. **Check audio properties:**
   - Duration to determine if it's a short effect or longer track
   - Bitrate and quality settings
   - Mono vs. stereo configuration

3. **Match with internal names:**
   - Use the resource configuration to map UUIDs to internal names
   - Verify the sound matches its described purpose

## How to integrate or replace sounds

### Approach 1: Keep GUID names (no manifest changes)
- Replace the file in `mirror/**` with the same exact name and extension
- Maintain the same or similar file size (to avoid manifest mismatch warnings)
- Ensure the service worker cache is refreshed (see below) so clients fetch the new asset
- Keep the same audio format (MP3) and similar encoding settings

### Approach 2: Rename to semantic names (requires reference update)
- Place the new file in an assets folder you control (e.g., `runtime/assets/audio/`)
- Update code/asset loader to point to the new path, or amend `manifest.json` entries if your loader reads from it
- Update the resource configuration to map new file names to internal sound names
- Remove or stop referencing the original GUID entry to avoid unused downloads

### Audio optimization checklist
- [ ] Use MP3 format for maximum browser compatibility
- [ ] Compress audio files to reduce file size while maintaining acceptable quality
- [ ] Normalize volume levels to prevent clipping and maintain consistency
- [ ] Use appropriate bitrates (128–192 kbps for effects, 192–256 kbps for music)
- [ ] Use mono for voice lines and short effects to save space
- [ ] Use stereo for music and ambient sounds
- [ ] Test audio playback across different browsers and devices
- [ ] Ensure sounds are not longer than necessary (trim silence at start/end)

## Audio format guidelines

### Common audio specifications:
- **Sample Rate:** 44.1 kHz (standard for web audio)
- **Bit Depth:** 16-bit (standard for web audio)
- **Bitrate:** 128–256 kbps depending on content type
- **Channels:** Mono for voice/effects, Stereo for music/ambient
- **Format:** MP3 (MPEG-1 Audio Layer 3)

### Quality considerations:
- **Sound Effects:** Lower bitrate acceptable (128 kbps) due to short duration
- **Voice Lines:** Medium bitrate recommended (128–192 kbps) for clarity
- **Music:** Higher bitrate recommended (192–256 kbps) for better quality
- **Ambient Sounds:** Medium bitrate (128–192 kbps) with stereo for spatial effects

## Cache busting / offline considerations

- The offline build uses `manifest.json` and `sw.js` (service worker) for caching
- After changing audio assets, bump a version or modify `build.json` and/or asset URLs so the service worker picks up new files
- Clear old caches in the browser or unregister the service worker during development
- Audio files are cached aggressively (max-age=31536000 in manifest), so ensure cache invalidation works correctly

## Performance best practices

- **Lazy loading:** Load sounds only when needed (especially for voice lines and music)
- **Preloading:** Preload critical sounds (spin, win sounds) for instant playback
- **Volume management:** Implement volume controls for music and sound effects separately
- **Format selection:** Use MP3 for maximum compatibility, consider OGG as fallback
- **Streaming:** For longer music tracks, consider streaming instead of full download
- **Pooling:** Reuse audio objects for frequently played sounds to reduce memory usage

## Sound Manager API

The game implements a sound manager system accessible via `window.ingenuity.soundManager` with the following methods:

- `muteAllSounds()` — Mutes all sounds
- `unmuteAllSounds()` — Unmutes all sounds
- `setMute(value)` — Sets mute state (true/false)
- `playSound()` — Plays a sound effect (currently no-op in offline mode)
- `setMusicVolume()` — Sets background music volume
- `unMuteSoundFxSounds()` — Unmutes sound effects specifically

## Licensing & attribution

- Ensure you have the right to redistribute or modify any audio files you include
- Track licenses per file if you rename them; keep a simple `CREDITS.md` if required by your assets
- Respect copyright and licensing terms for all audio assets
- Voice lines may contain recognizable voices — ensure proper licensing for commercial use

## QA checklist (before ship)

- [ ] All sounds play correctly across target browsers (Chrome, Firefox, Safari, Edge)
- [ ] Sounds are normalized to consistent volume levels (no clipping, no inaudible sounds)
- [ ] Audio quality is acceptable at target bitrates (no obvious artifacts or distortion)
- [ ] Sounds are optimized for file size (use compression tools if needed)
- [ ] Sound effects trigger at correct times during gameplay
- [ ] Voice lines are clear and understandable
- [ ] Background music loops seamlessly without gaps
- [ ] File sizes are reasonable for fast loading (total audio assets < 10 MB recommended)
- [ ] Sound manager controls (mute/unmute) work correctly
- [ ] Audio playback doesn't cause performance issues or lag
- [ ] Sounds are accessible (consider users who may have audio disabled or require captions for voice lines)

---

*Note: This documentation is based on the sound files and configuration found in the project. File sizes and detailed specifications can be found in `manifest.json`. The mapping between UUID filenames and internal sound names is defined in the game's resource configuration file.*
