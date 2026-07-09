"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Position = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  position?: Position;
  children: React.ReactNode;
}

const GAP = 8;
const VIEWPORT_PADDING = 8;

const FALLBACK_ORDER: Record<Position, Position[]> = {
  top: ["top", "bottom", "right", "left"],
  bottom: ["bottom", "top", "right", "left"],
  left: ["left", "right", "top", "bottom"],
  right: ["right", "left", "top", "bottom"],
};

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object") {
        (ref as React.RefObject<T | null>).current = node;
      }
    }
  };
}

function getCoords(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferred: Position
): { top: number; left: number; position: Position } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates: Record<Position, { top: number; left: number }> = {
    top: {
      top: triggerRect.top - tooltipRect.height - GAP,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
    bottom: {
      top: triggerRect.bottom + GAP,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
    left: {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.left - tooltipRect.width - GAP,
    },
    right: {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.right + GAP,
    },
  };

  const fits = (top: number, left: number) =>
    top >= VIEWPORT_PADDING &&
    left >= VIEWPORT_PADDING &&
    top + tooltipRect.height <= vh - VIEWPORT_PADDING &&
    left + tooltipRect.width <= vw - VIEWPORT_PADDING;

  for (const pos of FALLBACK_ORDER[preferred]) {
    const { top, left } = candidates[pos];
    if (fits(top, left)) {
      return { top, left, position: pos };
    }
  }

  const fallback = candidates[preferred];
  return {
    top: Math.max(
      VIEWPORT_PADDING,
      Math.min(fallback.top, vh - tooltipRect.height - VIEWPORT_PADDING)
    ),
    left: Math.max(
      VIEWPORT_PADDING,
      Math.min(fallback.left, vw - tooltipRect.width - VIEWPORT_PADDING)
    ),
    position: preferred,
  };
}

export default function Tooltip({ content, position = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [resolvedPosition, setResolvedPosition] = useState<Position>(position);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const next = getCoords(
      trigger.getBoundingClientRect(),
      tooltip.getBoundingClientRect(),
      position
    );
    setCoords({ top: next.top, left: next.left });
    setResolvedPosition(next.position);
    setReady(true);
  }, [position]);

  useLayoutEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    updatePosition();
  }, [visible, content, updatePosition]);

  useLayoutEffect(() => {
    if (!visible) return;

    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, updatePosition]);

  if (!content) return <>{children}</>;

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const portal =
    visible && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tooltipRef}
            className={`custom-tooltip-content custom-tooltip-portal position-${resolvedPosition}${
              ready ? " is-visible" : ""
            }`}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )
      : null;

  if (React.Children.count(children) !== 1) {
    return (
      <>
        {children}
        {portal}
      </>
    );
  }

  const child = React.Children.toArray(children)[0];

  if (!React.isValidElement(child)) {
    return (
      <>
        <span
          className="custom-tooltip-trigger"
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          {child}
        </span>
        {portal}
      </>
    );
  }

  const childProps = child.props as {
    ref?: React.Ref<HTMLElement>;
    onMouseEnter?: React.MouseEventHandler;
    onMouseLeave?: React.MouseEventHandler;
    onFocus?: React.FocusEventHandler;
    onBlur?: React.FocusEventHandler;
  };

  const trigger = React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(triggerRef, childProps.ref),
    onMouseEnter: (event: React.MouseEvent) => {
      show();
      childProps.onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      hide();
      childProps.onMouseLeave?.(event);
    },
    onFocus: (event: React.FocusEvent) => {
      show();
      childProps.onFocus?.(event);
    },
    onBlur: (event: React.FocusEvent) => {
      hide();
      childProps.onBlur?.(event);
    },
  });

  return (
    <>
      {trigger}
      {portal}
    </>
  );
}
