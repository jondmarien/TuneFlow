// --- useIsMobile Hook ---

/**
 * Custom React hook to detect if the current viewport is mobile-sized.
 *
 * Listens for window resize events and updates state accordingly.
 *
 * @returns {boolean} True if the viewport width is less than the mobile breakpoint, otherwise false.
 */

import * as React from "react"

/**
 * The maximum width (in pixels) that is considered a mobile viewport.
 */
const MOBILE_BREAKPOINT = 768

/**
 * Custom React hook to detect if the current viewport is mobile-sized.
 *
 * @returns {boolean} True if the viewport width is less than the mobile breakpoint, otherwise false.
 */
export function useIsMobile() {
  /**
   * State variable to track whether the current viewport is mobile-sized.
   */
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  /**
   * Effect hook to listen for window resize events and update state accordingly.
   */
  React.useEffect(() => {
    /**
     * Media query to detect when the viewport width is less than the mobile breakpoint.
     */
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    /**
     * Event handler to update state when the media query changes.
     */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    /**
     * Cleanup function to remove event listener when the component unmounts.
     */
    return () => mql.removeEventListener("change", onChange)
  }, [])

  /**
   * Return the current mobile state.
   */
  return !!isMobile
}
