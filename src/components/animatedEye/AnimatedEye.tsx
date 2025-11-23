import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Fade,
} from "@mui/material";
import { AnimatedEyeProps } from "./types";
import { EyeVisual } from "./components/EyeVisual";
import { InputSection } from "./components/InputSection";
import ChatHistory, { type ChatMessage } from "./components/ChatHistory";
import { getChatMessages } from "@/lib/appwrite";
import { useBlink } from "./hooks/useBlink";
import { usePupilMovement } from "./hooks/usePupilMovement";
import { useInputFocus } from "./hooks/useInputFocus";
import { generateRandomPupilPosition } from "./utils/positionUtils";
import AudioVisualizer from "./components/AudioVisualizer";

// Import assets
import soundFile from "@/assets/sound.mp3";
import skyImg from "@/assets/sky.jpg";
import infernoImg from "@/assets/inferno.jpg";

interface ExtendedProps extends AnimatedEyeProps {
  showSnackbar?: (
    msg: string,
    severity?: "success" | "error" | "info" | "warning"
  ) => void;
  onChatRefresh?: () => void;
  loading?: boolean;
  onAngryStateChange?: (isAngry: boolean) => void;
}

export default function AnimatedEyes({
  size = 180,
  showSnackbar,
  onChatRefresh,
  loading = false,
  onAngryStateChange,
}: ExtendedProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // --- REFS ---
  const eyeRef1 = useRef<HTMLDivElement | null>(null);
  const eyeRef2 = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioObjRef = useRef<HTMLAudioElement | null>(null);

  const idleMoveInterval = useRef<NodeJS.Timeout | null>(null);
  const idleBlinkInterval = useRef<NodeJS.Timeout | null>(null);
  const idleStartTimeout = useRef<NodeJS.Timeout | null>(null);
  const mouseOutRef = useRef<boolean>(false);
  const sequenceTimeouts = useRef<NodeJS.Timeout[]>([]);

  // --- STATE ---
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  // Audio State
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Asset State
  const [skyBlobUrl, setSkyBlobUrl] = useState<string | undefined>(undefined);
  const [infernoBlobUrl, setInfernoBlobUrl] = useState<string | undefined>(
    undefined
  );

  const [clickCount, setClickCount] = useState(0);
  const [isAngry, setIsAngry] = useState(false);
  const [isTightSquint, setIsTightSquint] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSky, setShowSky] = useState(false);
  const [showInferno, setShowInferno] = useState(false);
  const [glintState, setGlintState] = useState<"normal" | "flash" | "growing">(
    "normal"
  );
  // NEW STATE: To block clicks during the 30s mobile wait
  const [isWaitingMobile, setIsWaitingMobile] = useState(false);

  // Notify parent
  useEffect(() => {
    if (onAngryStateChange) {
      onAngryStateChange(isAngry);
    }
  }, [isAngry, onAngryStateChange]);

  // --- ROBUST ASSET LOADING ---
  useEffect(() => {
    const audio = new Audio(soundFile);
    audio.preload = "auto";

    // Strict readiness check
    const onCanPlay = () => setIsAudioReady(true);

    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("canplay", onCanPlay);

    // Store in ref
    audioObjRef.current = audio;

    // FIX: All initial state updates wrapped in setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (audio.readyState >= 3) {
        setIsAudioReady(true);
      }
      setActiveAudio(audio);
      setSkyBlobUrl(skyImg);
      setInfernoBlobUrl(infernoImg);
    }, 0);

    return () => {
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.removeEventListener("canplay", onCanPlay);
      audio.pause();
    };
  }, []);

  // --- HOOKS ---
  const {
    topTransform,
    bottomTransform,
    performBlink,
    doubleBlink,
    openEyes,
    squintEyes,
  } = useBlink();

  const {
    pupilRef: pupilRef1,
    updatePupilPosition: updatePupilPosition1,
    handleMouseMove: handleMouseMove1,
    setPupilOffset: setPupilOffset1,
  } = usePupilMovement({ size, eyeRef: eyeRef1, isFocused });

  const {
    pupilRef: pupilRef2,
    updatePupilPosition: updatePupilPosition2,
    handleMouseMove: handleMouseMove2,
    setPupilOffset: setPupilOffset2,
  } = usePupilMovement({ size, eyeRef: eyeRef2, isFocused });

  const { inputValue, handleInput, updatePupilToInput } = useInputFocus({
    updatePupilPosition: (x: number, y: number) => {
      if (isAngry || isResetting) return;
      updatePupilPosition1(x, y);
      if (!isMobile) updatePupilPosition2(x, y);
    },
    inputRef,
    canvasRef,
    isFocused,
  });

  // --- HELPERS ---
  const stopIdleBehavior = useCallback(() => {
    if (idleStartTimeout.current) clearTimeout(idleStartTimeout.current);
    if (idleMoveInterval.current) clearInterval(idleMoveInterval.current);
    if (idleBlinkInterval.current) clearInterval(idleBlinkInterval.current);
  }, []);

  const startIdleBehavior = useCallback(() => {
    setPupilOffset1(0, 0, "0.5s");
    if (!isMobile) setPupilOffset2(0, 0, "0.5s");
    stopIdleBehavior();
    idleBlinkInterval.current = setInterval(() => doubleBlink(), 2000);
    idleStartTimeout.current = setTimeout(() => {
      if (!mouseOutRef.current) return;
      const move = () => {
        const { x, y } = generateRandomPupilPosition(size);
        setPupilOffset1(x, y, "2s");
        if (!isMobile) setPupilOffset2(x, y, "2s");
      };
      move();
      idleMoveInterval.current = setInterval(move, 2500);
    }, 500);
  }, [
    doubleBlink,
    isMobile,
    setPupilOffset1,
    setPupilOffset2,
    size,
    stopIdleBehavior,
  ]);

  const resetNormalState = useCallback(() => {
    setIsResetting(true);
    setIsAngry(false);
    setIsTightSquint(false);
    setShowSky(false);
    setShowInferno(false);
    setGlintState("normal");
    setClickCount(0);
    setIsWaitingMobile(false); // Reset delay state

    if (audioObjRef.current) {
      audioObjRef.current.pause();
      audioObjRef.current.currentTime = 0;
    }

    sequenceTimeouts.current.forEach((t) => clearTimeout(t));
    sequenceTimeouts.current = [];
    openEyes();

    setTimeout(() => {
      setIsResetting(false);
      if (mouseOutRef.current) startIdleBehavior();
      else stopIdleBehavior();
    }, 5000);
  }, [startIdleBehavior, stopIdleBehavior, openEyes]);

  const startAngrySequence = useCallback(() => {
    const audio = audioObjRef.current;
    if (!audio) return;

    // Desktop Check: Only start if strictly ready.
    // Mobile Check: Bypassed because we guarantee readiness via the 30s buffering timeout.
    if (!isMobile && !isAudioReady && audio.readyState < 3) {
      showSnackbar?.("در حال بارگذاری صدا...", "info");
      audio.load();
      return;
    }

    setIsAngry(true);
    setIsWaitingMobile(false);
    setClickCount(0);
    stopIdleBehavior();

    audio.currentTime = 0;
    audio.volume = 1.0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        console.error("Audio play failed:", e);
        setIsAngry(false);
        showSnackbar?.("خطا در پخش صدا.", "warning");
      });
    }

    setPupilOffset1(0, 0, "0.5s");
    if (!isMobile) setPupilOffset2(0, 0, "0.5s");

    sequenceTimeouts.current.push(
      setTimeout(() => setGlintState("flash"), 2000),
      setTimeout(() => setGlintState("normal"), 2300),
      setTimeout(() => setGlintState("growing"), 3000),
      setTimeout(() => setShowSky(true), 7000),
      setTimeout(() => setShowSky(false), 11000),
      setTimeout(() => setShowInferno(true), 13000),
      setTimeout(() => setShowInferno(false), 20000),
      setTimeout(() => setIsTightSquint(true), 23700),
      setTimeout(() => {
        if (audio) {
          const fadeInterval = setInterval(() => {
            if (audio.volume > 0.05) audio.volume -= 0.05;
            else {
              audio.volume = 0;
              audio.pause();
              clearInterval(fadeInterval);
            }
          }, 100);
        }
      }, 28000),
      setTimeout(() => resetNormalState(), 31000)
    );
  }, [
    stopIdleBehavior,
    resetNormalState,
    isMobile,
    setPupilOffset1,
    setPupilOffset2,
    showSnackbar,
    isAudioReady,
  ]);

  const handleEyeClick = useCallback(() => {
    // If waiting for the 30s timer, ignore clicks
    if (isAngry || isResetting || isWaitingMobile) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount < 3) {
      performBlink();
      // On mobile, try to load audio early on first click
      if (isMobile && newCount === 1 && audioObjRef.current) {
        audioObjRef.current.load();
      }
    } else {
      // --- TRIGGER LOGIC (3rd Click) ---
      if (isMobile) {
        // MOBILE: 30-Second Buffer Delay
        if (audioObjRef.current) {
          // 1. Play muted immediately to unlock audio context & buffer
          audioObjRef.current.volume = 0;
          audioObjRef.current
            .play()
            .catch((e) => console.warn("Pre-buffer failed", e));

          // 2. Set waiting state (Eye continues idle behavior/blinking)
          setIsWaitingMobile(true);
          showSnackbar?.("لطفا ۳۰ ثانیه صبر کنید...", "info");

          // 3. Wait 30 seconds
          setTimeout(() => {
            // 4. Start sequence: reset audio and go
            if (audioObjRef.current) {
              audioObjRef.current.pause();
              audioObjRef.current.currentTime = 0;
            }
            startAngrySequence();
          }, 30000);
        }
      } else {
        // DESKTOP: Immediate Execution (with strict check)
        if (
          audioObjRef.current &&
          (isAudioReady || audioObjRef.current.readyState >= 3)
        ) {
          startAngrySequence();
        } else {
          audioObjRef.current?.load();
          showSnackbar?.("درحال دریافت فایل صوتی...", "warning");
          setClickCount(2);
        }
      }
    }
  }, [
    clickCount,
    isAngry,
    isResetting,
    isWaitingMobile,
    performBlink,
    startAngrySequence,
    isAudioReady,
    showSnackbar,
    isMobile,
  ]);

  // Mouse Events
  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isAngry || isResetting) return;
      if (mouseOutRef.current) {
        mouseOutRef.current = false;
        stopIdleBehavior();
      }
      handleMouseMove1(event);
      if (!isMobile) handleMouseMove2(event);
    },
    [
      handleMouseMove1,
      handleMouseMove2,
      isMobile,
      stopIdleBehavior,
      isAngry,
      isResetting,
    ]
  );

  const onMouseLeave = useCallback(() => {
    if (isFocused || isAngry || isResetting) return;
    mouseOutRef.current = true;
    startIdleBehavior();
  }, [isFocused, startIdleBehavior, isAngry, isResetting]);

  const onMouseEnter = useCallback(() => {
    mouseOutRef.current = false;
    if (!isAngry && !isResetting) stopIdleBehavior();
  }, [stopIdleBehavior, isAngry, isResetting]);

  const onVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") onMouseLeave();
    else onMouseEnter();
  }, [onMouseEnter, onMouseLeave]);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopIdleBehavior();
    };
  }, [
    onMouseMove,
    onMouseLeave,
    onMouseEnter,
    onVisibilityChange,
    stopIdleBehavior,
  ]);

  const getEyelidTransforms = () => {
    if (isTightSquint)
      return { top: "translateY(-30%)", bottom: "translateY(50%)" };
    if (isAngry) return { top: "translateY(-30%)", bottom: "translateY(70%)" };
    return { top: topTransform, bottom: bottomTransform };
  };

  const { top: currentTop, bottom: currentBottom } = getEyelidTransforms();
  const getEyeGap = () => (isMobile ? 0 : 6);

  const handleFocus = useCallback(() => {
    if (isAngry || isResetting) return;
    setIsFocused(true);
    stopIdleBehavior();
    squintEyes();
    setTimeout(updatePupilToInput, 0);
  }, [squintEyes, stopIdleBehavior, updatePupilToInput, isAngry, isResetting]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    openEyes();
  }, [openEyes]);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    }
    return () => {
      if (input) {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      }
    };
  }, [handleFocus, handleBlur]);

  const handleNewMessage = useCallback(
    (newMsg: ChatMessage) => {
      setMessages((prev) => {
        const updated = [...prev, newMsg];
        if (updated.length > 0) setChatVisible(true);
        return updated;
      });
      if (newMsg.role === "assistant" && onChatRefresh) onChatRefresh();
    },
    [onChatRefresh]
  );

  const loadHistory = useCallback(async () => {
    try {
      const typedHistory = await getChatMessages();
      setMessages(typedHistory);
      if (typedHistory.length > 0) setChatVisible(true);
    } catch {
      showSnackbar?.("خطا در بارگذاری چت", "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    const init = async () => await loadHistory();
    init();
  }, [loadHistory]);

  const handleClick = useCallback(() => performBlink(), [performBlink]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        minHeight: "70vh",
        backgroundColor: "black",
        p: 2,
        gap: 2,
        direction: "rtl",
        position: "relative",
      }}
      dir="rtl"
    >
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          <CircularProgress size={60} sx={{ color: "white" }} />
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          gap: getEyeGap(),
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <EyeVisual
          size={size}
          eyeRef={eyeRef1}
          pupilRef={pupilRef1}
          topTransform={currentTop}
          bottomTransform={currentBottom}
          isAngry={isAngry}
          isResetting={isResetting}
          showSky={showSky}
          showInferno={showInferno}
          glintState={glintState}
          onClick={handleEyeClick}
          isLeft={true}
          isMobile={isMobile}
          skyImageSrc={skyBlobUrl}
          infernoImageSrc={infernoBlobUrl}
        />
        {!isMobile && (
          <EyeVisual
            size={size}
            eyeRef={eyeRef2}
            pupilRef={pupilRef2}
            topTransform={currentTop}
            bottomTransform={currentBottom}
            isAngry={isAngry}
            isResetting={isResetting}
            showSky={showSky}
            showInferno={showInferno}
            glintState={glintState}
            onClick={handleEyeClick}
            isLeft={false}
            isMobile={isMobile}
            skyImageSrc={skyBlobUrl}
            infernoImageSrc={infernoBlobUrl}
          />
        )}
      </Box>

      <Fade in={!isAngry} timeout={500}>
        <Typography
          variant="h3"
          sx={{
            color: "white",
            textAlign: "center",
            fontFamily: "inherit",
            direction: "rtl",
            mb: 0,
            width: "100%",
            visibility: isAngry ? "hidden" : "visible",
          }}
          dir="rtl"
        >
          من <span style={{ fontWeight: "bold", color: "#FFC400" }}>مادر</span>{" "}
          فرم ها هستم
        </Typography>
      </Fade>

      <Box
        sx={{
          width: "100%",
          maxWidth: 800,
          alignSelf: "center",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: isAngry ? "flex" : "none",
            justifyContent: "center",
            mt: 2,
          }}
        >
          <AudioVisualizer audioElement={activeAudio} isActive={isAngry} />
        </Box>

        <Box sx={{ width: "100%", display: !isAngry ? "block" : "none" }}>
          <InputSection
            inputRef={inputRef}
            value={inputValue}
            onChange={handleInput}
            onClick={handleClick}
            onNewMessage={handleNewMessage}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            loadHistory={loadHistory}
            showSnackbar={showSnackbar}
          />
          <Box
            sx={{
              width: "100%",
              height: chatVisible ? 200 : 0,
              overflow: "hidden",
              transition: "height 0.5s ease",
              mb: 2,
            }}
          >
            <ChatHistory messages={messages} isLoading={isLoading} />
          </Box>
        </Box>
      </Box>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
}
