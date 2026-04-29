---
Task ID: 1
Agent: main
Task: Add prompt copy-to-clipboard and external image upload features for storyboard step

Work Log:
- Added Copy, Upload, X icons from lucide-react
- Implemented copyToClipboard() and fileToBase64() utilities
- Rewrote ImageGenPanel with copy-on-click, drag-drop upload, hover actions
- Fixed duplicate Check import
- Built and deployed to Vercel

Stage Summary:
- Production URL: https://huobao-drama-v2.vercel.app
---
Task ID: 2
Agent: full-stack-developer
Task: Implement core asset management system for character/scene consistency

Work Log:
- Enhanced Character Dialog: reference image upload (main + 3 additional), seed value, structured visual attributes (gender/age/hair/eyes/skin/body/clothing/distinguishing), AI-generate English description button
- Enhanced Character Cards: show reference image, seed badge, reference images badge
- Enhanced Scene Dialog: reference image upload, environment attributes (type/architecture/lighting/weather/season/colorTone/keyProps), AI-generate English description
- Enhanced Scene Cards: reference image preview, edit button
- Added Global Style Config in Overview Tab: aspect ratio selector, quality keywords, style prefix, negative prompts, reset defaults
- Enhanced image_prompt_generator Agent: loads drama metadata, characters, scenes, storyboard-character associations; composes rich context with style config, character visual descriptions, scene environment descriptions
- Backward compatible with existing plain-text data
- Build passed, deployed to Vercel production

Stage Summary:
- All core asset management features implemented
- drama-detail.tsx: 822 → 1824 lines
- agent/route.ts: 583 → 713 lines
- Production: https://huobao-drama-v2.vercel.app
