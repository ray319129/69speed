import { Hands, Results } from '@mediapipe/hands';

export class HandDetector {
  private hands: Hands;

  constructor(onResults: (results: Results) => void) {
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
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
  // Simple fist detection: check if fingertips are closer to the palm than the middle joints
  // Landmarks: 8 (index tip), 12 (middle tip), 16 (ring tip), 20 (pinky tip)
  // Joints: 6 (index pip), 10 (middle pip), 14 (ring pip), 18 (pinky pip)
  // Palm base: 0 (wrist)
  
  const fingerTips = [8, 12, 16, 20];
  const fingerPips = [6, 10, 14, 18];
  const wrist = landmarks[0];

  let closedFingers = 0;
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const pip = landmarks[fingerPips[i]];
    
    // Distance from wrist
    const distTip = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
    const distPip = Math.sqrt(Math.pow(pip.x - wrist.x, 2) + Math.pow(pip.y - wrist.y, 2));
    
    if (distTip < distPip) {
      closedFingers++;
    }
  }

  return closedFingers >= 3;
};
