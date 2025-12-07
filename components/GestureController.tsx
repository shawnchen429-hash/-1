import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useAppStore } from '../store';
import { TreeState } from '../types';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const GestureController: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  
  const { setTreeState, updateHandPosition, setGesture, isWebcamActive, setWebcamActive } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize MediaPipe Gesture Recognizer
  useEffect(() => {
    const createGestureRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setGestureRecognizer(recognizer);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading gesture recognizer:", error);
        setIsLoading(false); // Fail gracefully
      }
    };
    createGestureRecognizer();
  }, []);

  const predictWebcam = useCallback(() => {
    if (!gestureRecognizer || !webcamRef.current || !webcamRef.current.video || !canvasRef.current) return;
    
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    const nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(video, nowInMs);

    const canvasCtx = canvasRef.current.getContext("2d");
    if(!canvasCtx) return;
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.gestures.length > 0) {
      const gestureName = results.gestures[0][0].categoryName;
      const handLandmarks = results.landmarks[0];
      
      // Update Store with Gesture
      setGesture(gestureName);
      
      // Logic: Open_Palm -> CHAOS, Closed_Fist -> FORMED
      if (gestureName === 'Open_Palm') {
        setTreeState(TreeState.CHAOS);
      } else if (gestureName === 'Closed_Fist') {
        setTreeState(TreeState.FORMED);
      }

      // Logic: Hand Position controls Camera
      // Get wrist position (index 0)
      if (handLandmarks && handLandmarks[0]) {
         const x = handLandmarks[0].x; // 0 to 1
         const y = handLandmarks[0].y; // 0 to 1
         
         // Invert X because webcam is mirrored visually usually, map to -1 to 1
         updateHandPosition((x - 0.5) * -2, (y - 0.5) * 2);
      }

      // Draw landmarks
      const drawingUtils = new DrawingUtils(canvasCtx);
      drawingUtils.drawConnectors(handLandmarks, GestureRecognizer.HAND_CONNECTIONS, {
         color: "#00FF00",
         lineWidth: 2
      });
      drawingUtils.drawLandmarks(handLandmarks, {
         color: "#FF0000",
         radius: 1
      });
    } else {
      setGesture('None');
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [gestureRecognizer, setTreeState, updateHandPosition, setGesture]);

  useEffect(() => {
    if (isWebcamActive && gestureRecognizer) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isWebcamActive, gestureRecognizer, predictWebcam]);

  // Handle manual toggle for backup
  const toggleWebcam = () => {
     setWebcamActive(!isWebcamActive);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
       {/* Preview Window */}
       <div className={`relative transition-all duration-500 overflow-hidden rounded-lg border-2 border-[#cfb53b] bg-black ${isWebcamActive ? 'w-48 h-36 opacity-100' : 'w-0 h-0 opacity-0'}`}>
          <Webcam
             ref={webcamRef}
             className="absolute top-0 left-0 w-full h-full object-cover mirror"
             mirrored={true}
          />
          <canvas 
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover mirror"
            width={320}
            height={240}
          />
       </div>
       
       {/* Controls */}
       <div className="flex gap-2">
         <button 
           onClick={toggleWebcam}
           disabled={isLoading}
           className={`px-4 py-2 font-serif text-sm tracking-wider uppercase border border-[#cfb53b] text-[#cfb53b] bg-[#001a0d] hover:bg-[#cfb53b] hover:text-[#001a0d] transition-all disabled:opacity-50`}
         >
            {isLoading ? 'Loading Model...' : (isWebcamActive ? 'Disable Camera' : 'Enable Gesture Control')}
         </button>
       </div>
       
       <div className="text-xs text-[#cfb53b] font-light bg-black/50 p-2 rounded">
         Gestures: <span className="font-bold">Open Palm</span> (Unleash) | <span className="font-bold">Fist</span> (Form)
       </div>
    </div>
  );
};

export default GestureController;
