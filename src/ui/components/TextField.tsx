import { useState, useEffect } from "react";
import { Text, useInput } from "ink";
import { COLOR } from "../theme";

export interface TextFieldProps {
  isDisabled?: boolean;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onExitDown?: () => void;
  onExitLeft?: () => void;
}

interface Edit {
  value: string;
  cursor: number;
}

export function deleteBefore(value: string, cursor: number): Edit {
  if (cursor === 0) return { value, cursor };
  return {
    value: value.slice(0, cursor - 1) + value.slice(cursor),
    cursor: cursor - 1,
  };
}

export function deleteWordBefore(value: string, cursor: number): Edit {
  let i = cursor;
  while (i > 0 && value[i - 1] === " ") i--;
  while (i > 0 && value[i - 1] !== " ") i--;
  return { value: value.slice(0, i) + value.slice(cursor), cursor: i };
}

export function killToEnd(value: string, cursor: number): Edit {
  return { value: value.slice(0, cursor), cursor };
}

export function insertAt(value: string, cursor: number, text: string): Edit {
  return {
    value: value.slice(0, cursor) + text + value.slice(cursor),
    cursor: cursor + text.length,
  };
}

const CURSOR = " ";

const PLACEHOLDERS = [
  "Search or paste a magnet link…",
  "Find your favorite Linux ISO…",
  "Search for open source software…",
  "Look up classic literature…",
  "Find royalty free music…"
];

function TypingPlaceholder({ basePlaceholder }: { basePlaceholder: string }) {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  const texts = basePlaceholder === "Search torrents…" || basePlaceholder === "Search or paste a magnet link…" 
     ? PLACEHOLDERS 
     : [basePlaceholder];

  useEffect(() => {
    const text = texts[textIndex % texts.length] || "";
    let timer: NodeJS.Timeout;
    
    if (isDeleting) {
      if (charIndex === 0) {
        setIsDeleting(false);
        setTextIndex((i) => i + 1);
      } else {
        timer = setTimeout(() => setCharIndex((c) => c - 1), 20);
      }
    } else {
      if (charIndex === text.length) {
        if (texts.length > 1) {
          timer = setTimeout(() => setIsDeleting(true), 3000);
        }
      } else {
        timer = setTimeout(() => setCharIndex((c) => c + 1), 50);
      }
    }
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, textIndex, texts]);

  useEffect(() => {
    const timer = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(timer);
  }, []);

  const currentText = (texts[textIndex % texts.length] || "").slice(0, charIndex);

  return (
    <Text>
      <Text color={COLOR.dim}>{currentText}</Text>
      {blink ? <Text inverse>{" "}</Text> : <Text color={COLOR.dim}> </Text>}
    </Text>
  );
}

export function TextField({
  isDisabled = false,
  defaultValue = "",
  placeholder = "",
  onChange,
  onSubmit,
  onExitDown,
  onExitLeft,
}: TextFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [cursor, setCursor] = useState(defaultValue.length);
  const [selection, setSelection] = useState<[number, number] | null>(null);

  function apply(next: Edit): void {
    setValue(next.value);
    setCursor(Math.max(0, Math.min(next.value.length, next.cursor)));
    setSelection(null);
    if (next.value !== value) onChange?.(next.value);
  }

  useInput(
    (input, key) => {
      if (key.downArrow) {
        onExitDown?.();
        return;
      }
      if (key.upArrow || key.tab || (key.ctrl && input === "c")) return;

      if (key.return) {
        onSubmit?.(value);
        return;
      }

      if (key.ctrl) {
        switch (input) {
          case "u":
            apply({ value: "", cursor: 0 });
            return;
          case "w":
            if (selection) {
              apply({ value: value.slice(0, selection[0]) + value.slice(selection[1]), cursor: selection[0] });
            } else {
              apply(deleteWordBefore(value, cursor));
            }
            return;
          case "k":
            if (selection) {
              apply({ value: value.slice(0, selection[0]) + value.slice(selection[1]), cursor: selection[0] });
            } else {
              apply(killToEnd(value, cursor));
            }
            return;
          case "a":
            if (value.length > 0) {
              setSelection([0, value.length]);
              setCursor(value.length);
            }
            return;
          case "e":
            setSelection(null);
            setCursor(value.length);
            return;
          default:
            break;
        }
      }

      if (key.leftArrow) {
        if (selection) {
          setCursor(selection[0]);
          setSelection(null);
          return;
        }
        if (cursor === 0) {
          onExitLeft?.();
          return;
        }
        setCursor(cursor - 1);
        return;
      }
      if (key.rightArrow) {
        if (selection) {
          setCursor(selection[1]);
          setSelection(null);
          return;
        }
        setCursor(Math.min(value.length, cursor + 1));
        return;
      }
      if (key.backspace || key.delete) {
        if (selection) {
          apply({ value: value.slice(0, selection[0]) + value.slice(selection[1]), cursor: selection[0] });
          return;
        }
        apply(deleteBefore(value, cursor));
        return;
      }
      if (key.meta || key.ctrl || !input) return;
      const text = input.replace(/\x1b?\[<\d+;\d+;\d+[Mm]/g, "");
      if (!text) return;
      
      if (selection) {
        const [start, end] = selection;
        const newValue = value.slice(0, start) + text + value.slice(end);
        apply({ value: newValue, cursor: start + text.length });
        return;
      }
      
      apply(insertAt(value, cursor, text));
    },
    { isActive: !isDisabled },
  );

  if (isDisabled) {
    return value ? <Text>{value}</Text> : <Text color={COLOR.dim}>{placeholder}</Text>;
  }

  if (selection) {
    const [start, end] = selection;
    const before = value.slice(0, start);
    const selected = value.slice(start, end) || CURSOR;
    const after = value.slice(end);
    
    return (
      <Text>
        {before}
        <Text inverse>{selected}</Text>
        {after}
      </Text>
    );
  }

  if (value.length === 0) {
    if (placeholder) {
      return <TypingPlaceholder basePlaceholder={placeholder} />;
    }
    return <Text inverse>{CURSOR}</Text>;
  }

  const before = value.slice(0, cursor);
  const atChar = value[cursor] ?? CURSOR;
  const after = cursor < value.length ? value.slice(cursor + 1) : "";
  return (
    <Text>
      {before}
      <Text inverse>{atChar}</Text>
      {after}
    </Text>
  );
}
