import { useRef, useState, useCallback, useEffect } from "react";
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
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

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

  // New State for Audio Visualizer
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Angry Mode State
  const [clickCount, setClickCount] = useState(0);
  const [isAngry, setIsAngry] = useState(false);
  const [isTightSquint, setIsTightSquint] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSky, setShowSky] = useState(false);
  const [showInferno, setShowInferno] = useState(false);
  const [glintState, setGlintState] = useState<"normal" | "flash" | "growing">(
    "normal"
  );

  // Notify parent
  useEffect(() => {
    if (onAngryStateChange) {
      onAngryStateChange(isAngry);
    }
  }, [isAngry, onAngryStateChange]);

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

  // --- HELPER FUNCTIONS ---
  const stopIdleBehavior = useCallback(() => {
    if (idleStartTimeout.current) {
      clearTimeout(idleStartTimeout.current);
      idleStartTimeout.current = null;
    }
    if (idleMoveInterval.current) {
      clearInterval(idleMoveInterval.current);
      idleMoveInterval.current = null;
    }
    if (idleBlinkInterval.current) {
      clearInterval(idleBlinkInterval.current);
      idleBlinkInterval.current = null;
    }
  }, []);

  const startIdleBehavior = useCallback(() => {
    setPupilOffset1(0, 0, "0.5s");
    if (!isMobile) setPupilOffset2(0, 0, "0.5s");

    stopIdleBehavior();

    idleBlinkInterval.current = setInterval(() => {
      doubleBlink();
    }, 2000);

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

  // --- RESET LOGIC ---
  const resetNormalState = useCallback(() => {
    setIsResetting(true);

    // Reset props
    setIsAngry(false);
    setIsTightSquint(false);
    setShowSky(false);
    setShowInferno(false);
    setGlintState("normal");
    setClickCount(0);

    if (audioObjRef.current) {
      try {
        audioObjRef.current.pause();
        audioObjRef.current.currentTime = 0;
      } catch (e) {
        console.warn(e);
      }
      audioObjRef.current = null;
      setActiveAudio(null);
    }

    sequenceTimeouts.current.forEach((t) => clearTimeout(t));
    sequenceTimeouts.current = [];

    openEyes();

    // Wait 5 seconds (2s delay + 3s transition)
    setTimeout(() => {
      setIsResetting(false);
      if (mouseOutRef.current) {
        startIdleBehavior();
      } else {
        stopIdleBehavior();
      }
    }, 5000);
  }, [startIdleBehavior, stopIdleBehavior, openEyes]);

  // --- ANGRY SEQUENCE ---
  const startAngrySequence = useCallback(() => {
    setIsAngry(true);
    setClickCount(0);
    stopIdleBehavior();

    const newAudio = new Audio("/asset/sound.mp3");
    newAudio.crossOrigin = "anonymous";
    newAudio.currentTime = 0;
    newAudio.volume = 1.0;

    audioObjRef.current = newAudio;
    setActiveAudio(newAudio);

    newAudio.play().catch((e) => {
      if (e.name !== "AbortError") console.error(e);
    });

    setPupilOffset1(0, 0, "0.5s");
    if (!isMobile) setPupilOffset2(0, 0, "0.5s");

    // --- TIMINGS ---
    const t1 = setTimeout(() => setGlintState("flash"), 2000);
    const t2 = setTimeout(() => setGlintState("normal"), 2300);
    const t3 = setTimeout(() => setGlintState("growing"), 3000);

    // 7s: Show Sky
    const t4 = setTimeout(() => setShowSky(true), 7000);
    // 8s: Hide Sky
    const t4_hide = setTimeout(() => setShowSky(false), 11000);

    // 10s: Show Inferno
    const t5_inf = setTimeout(() => setShowInferno(true), 13000);
    // 12s: Hide Inferno
    const t5_inf_hide = setTimeout(() => setShowInferno(false), 20000);

    // 15.0s: Tight Squint
    const t6 = setTimeout(() => {
      setIsTightSquint(true);
    }, 23700);
    const t_fade = setTimeout(() => {
      const audio = audioObjRef.current;
      if (audio) {
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume -= 0.05;
          } else {
            audio.volume = 0;
            clearInterval(fadeInterval);
          }
        }, 100);
      }
    }, 28000);
    // 16s: End Sequence
    const t7 = setTimeout(() => resetNormalState(), 31000);

    sequenceTimeouts.current.push(
      t1,
      t2,
      t3,
      t4,
      t4_hide,
      t5_inf,
      t5_inf_hide,
      t6,
      t_fade,
      t7
    );
  }, [
    stopIdleBehavior,
    resetNormalState,
    isMobile,
    setPupilOffset1,
    setPupilOffset2,
  ]);

  // --- INTERACTION ---
  const handleEyeClick = useCallback(() => {
    if (isAngry || isResetting) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount < 3) {
      performBlink();
    } else {
      startAngrySequence();
    }
  }, [clickCount, isAngry, isResetting, performBlink, startAngrySequence]);

  // --- MOUSE LOGIC ---
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

  // --- EFFECTS ---
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

  useEffect(() => {
    return () => {
      sequenceTimeouts.current.forEach((t) => clearTimeout(t));
      if (audioObjRef.current) {
        audioObjRef.current.pause();
        audioObjRef.current = null;
        setActiveAudio(null);
      }
    };
  }, []);

  // --- RENDER HELPERS ---
  const getEyelidTransforms = () => {
    if (isTightSquint) {
      return { top: "translateY(-30%)", bottom: "translateY(50%)" };
    }
    if (isAngry) {
      return { top: "translateY(-30%)", bottom: "translateY(70%)" };
    }
    return { top: topTransform, bottom: bottomTransform };
  };

  const { top: currentTop, bottom: currentBottom } = getEyelidTransforms();

  const getEyeGap = () => {
    if (isDesktop) return 6;
    if (isTablet) return 4;
    return 0;
  };

  // Input Handlers...
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
        // Fixed: Set visibility directly in handler, not useEffect
        if (updated.length > 0) setChatVisible(true);
        return updated;
      });
      if (newMsg.role === "assistant" && onChatRefresh) onChatRefresh();
    },
    [onChatRefresh]
  );

  // Fixed: Removed redundant useEffect watching messages.length

  const loadHistory = useCallback(async () => {
    try {
      const typedHistory = await getChatMessages();
      setMessages(typedHistory);
      // Fixed: Set visibility directly after data load
      if (typedHistory.length > 0) setChatVisible(true);
    } catch {
      showSnackbar?.("خطا در بارگذاری چت", "error");
    }
  }, [showSnackbar]);

  // Fixed: Wrapped in async IIFE to avoid synchronous set-state warning
  useEffect(() => {
    const init = async () => {
      await loadHistory();
    };
    init();
  }, [loadHistory]);

  const handleClick = useCallback(() => {
    performBlink();
  }, [performBlink]);

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
        {isAngry ? (
          <Fade in={true} timeout={1000}>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                mt: 2,
              }}
            >
              <AudioVisualizer audioElement={activeAudio} isActive={isAngry} />
            </Box>
          </Fade>
        ) : (
          <Fade in={true} timeout={1000}>
            <Box sx={{ width: "100%" }}>
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
          </Fade>
        )}
      </Box>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
}
