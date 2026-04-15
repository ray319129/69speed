import { Hands, Results } from '@mediapipe/hands';

export class HandDetector {
  private hands: Hands;

  constructor(onResults: (results: Results) => void) {
    console.log('Initializing HandDetector...');
    this.hands = new Hands({
      locateFile: (file) => {
        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        console.log('Loading MediaPipe file:', url);
        return url;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.hands.onResults(onResults);
  }

  async send(image: HTMLVideoElement | HTMLCanvasElement) {
    await this.hands.send({ image });
  }

  close() {
    this.hands.close();
  }
}

export const isFist = (landmarks: any[]) => {
  // Landmarks: 8, 12, 16, 20 are tips. 5, 9, 13, 17 are MCP (knuckles).
  // A fist is when tips are very close to MCPs or below them.
  const fingerTips = [8, 12, 16, 20];
  const fingerMcps = [5, 9, 13, 17];
  const wrist = landmarks[0];

  let closedFingers = 0;
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const mcp = landmarks[fingerMcps[i]];
    
    // In MediaPipe, Y increases downwards. 
    // If tip.y > mcp.y, the finger is likely curled down towards the palm.
    if (tip.y > mcp.y) {
      closedFingers++;
    }
  }

  // Thumb check (landmark 4 is tip, 2 is base)
  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  // If thumb tip is close to the palm (index MCP)
  const indexMcp = landmarks[5];
  const distThumbToIndex = Math.sqrt(Math.pow(thumbTip.x - indexMcp.x, 2) + Math.pow(thumbTip.y - indexMcp.y, 2));
  
  if (closedFingers >= 3 || (closedFingers >= 2 && distThumbToIndex < 0.1)) {
    return true;
  }

  return false;
};
