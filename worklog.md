---
Task ID: 1
Agent: main
Task: Add prompt copy-to-clipboard and external image upload features for storyboard step

Work Log:
- Read and analyzed episode-studio.tsx (1709 lines) to understand the ImageGenPanel component
- Identified storyboard API route supports composedImage field update
- Added Copy, Upload, X icons from lucide-react
- Implemented copyToClipboard() utility with clipboard API + fallback
- Implemented fileToBase64() utility for image upload
- Rewrote ImageGenPanel component with:
  - Copy button on each storyboard's image prompt
  - Click-on-text to copy prompt
  - File input + drag-and-drop image upload
  - Hover overlay on uploaded images with replace/remove actions
  - File validation (type + 10MB size limit)
  - Upload progress indicator
- Fixed duplicate Check import in lucide-react
- Built successfully with `npx next build`
- Deployed to Vercel production via CLI

Stage Summary:
- All features implemented and deployed
- Production URL: https://huobao-drama-v2.vercel.app
- Build: ✓ Compiled successfully
