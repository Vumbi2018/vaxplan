import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

export function IdleTimeoutController() {
  const { data: tenant } = useQuery<any>({ queryKey: ["/api/me/tenant"], staleTime: Infinity });
  
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Default to off if not configured, or if 0
    const timeoutMinutes = tenant?.settings?.security?.idleTimeoutMinutes;
    if (!timeoutMinutes || timeoutMinutes <= 0) {
      return;
    }
    
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    const resetTimer = () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      timeoutId.current = setTimeout(() => {
        // Idle timeout reached, log out
        window.location.href = "/api/logout?reason=idle";
      }, timeoutMs);
    };
    
    // Initial start
    resetTimer();
    
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    // Throttle the reset to avoid doing it on every single mousemove pixel
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetTimer();
        }, 1000);
      }
    };
    
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [tenant?.settings?.security?.idleTimeoutMinutes]);
  
  return null;
}
