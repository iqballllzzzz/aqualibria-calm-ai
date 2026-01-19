import React, { useState, useEffect } from "react";

interface TypingAnimationProps {
  text: string;
  highlightWord?: string;
  speed?: number;
  className?: string;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  highlightWord,
  speed = 50,
  className = "",
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  // Render with highlight
  const renderText = () => {
    if (!highlightWord || !displayedText.includes(highlightWord)) {
      return displayedText;
    }

    const parts = displayedText.split(highlightWord);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="font-bold text-foreground">{highlightWord}</span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <span className={className}>
      {renderText()}
      {!isComplete && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

export default TypingAnimation;