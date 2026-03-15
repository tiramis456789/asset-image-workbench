import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useViewerState } from "@/hooks/useViewerState";

describe("useViewerState", () => {
  it("clears marked-only mode when the last pinned image is removed", () => {
    const { result } = renderHook(() => useViewerState());

    act(() => {
      result.current.selectImage(0, 3);
      result.current.toggleMarker("a");
      result.current.toggleShowMarkedOnly();
    });

    expect(result.current.showMarkedOnly).toBe(true);
    expect(result.current.markedIds.has("a")).toBe(true);

    act(() => {
      result.current.toggleMarker("a");
    });

    expect(result.current.markedIds.size).toBe(0);
    expect(result.current.showMarkedOnly).toBe(false);
    expect(result.current.currentIndex).toBe(0);
  });
});
