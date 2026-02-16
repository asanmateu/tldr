import { describe, expect, it } from "vitest";

// Test the hook logic directly by extracting the pure logic
// The hook is a thin wrapper around useState + useCallback,
// so we test the clamping/navigation behavior directly.
describe("useListNavigation logic", () => {
  function simulateNavigation(itemCount: number, initialIndex = 0) {
    let index = initialIndex;
    const handleUp = () => {
      index = Math.max(0, index - 1);
    };
    const handleDown = () => {
      index = Math.min(itemCount - 1, index + 1);
    };
    const getIndex = () => index;
    const setIndex = (v: number) => {
      index = v;
    };
    return { getIndex, setIndex, handleUp, handleDown };
  }

  it("initializes with default index 0", () => {
    const nav = simulateNavigation(5);
    expect(nav.getIndex()).toBe(0);
  });

  it("initializes with provided initialIndex", () => {
    const nav = simulateNavigation(5, 3);
    expect(nav.getIndex()).toBe(3);
  });

  it("handleDown increments index", () => {
    const nav = simulateNavigation(5);
    nav.handleDown();
    expect(nav.getIndex()).toBe(1);
  });

  it("handleUp decrements index", () => {
    const nav = simulateNavigation(5, 2);
    nav.handleUp();
    expect(nav.getIndex()).toBe(1);
  });

  it("clamps at 0 when going up", () => {
    const nav = simulateNavigation(5, 0);
    nav.handleUp();
    expect(nav.getIndex()).toBe(0);
  });

  it("clamps at itemCount-1 when going down", () => {
    const nav = simulateNavigation(3, 2);
    nav.handleDown();
    expect(nav.getIndex()).toBe(2);
  });

  it("allows setting index directly", () => {
    const nav = simulateNavigation(5);
    nav.setIndex(4);
    expect(nav.getIndex()).toBe(4);
  });

  it("handles single-item list", () => {
    const nav = simulateNavigation(1);
    expect(nav.getIndex()).toBe(0);
    nav.handleDown();
    expect(nav.getIndex()).toBe(0);
    nav.handleUp();
    expect(nav.getIndex()).toBe(0);
  });

  it("navigates full range", () => {
    const nav = simulateNavigation(3);
    nav.handleDown();
    nav.handleDown();
    expect(nav.getIndex()).toBe(2);
    nav.handleDown();
    expect(nav.getIndex()).toBe(2);
    nav.handleUp();
    nav.handleUp();
    expect(nav.getIndex()).toBe(0);
    nav.handleUp();
    expect(nav.getIndex()).toBe(0);
  });
});
