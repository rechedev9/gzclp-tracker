import { useEffect, useRef } from 'react';

/**
 * Returns a ref callback that observes elements for viewport intersection
 * and adds 'landing-visible' class for fade-in animation.
 * If the page loads with a hash, all `.landing-fade-in` elements are
 * immediately made visible (no animation delay on anchor navigation).
 */
export function useFadeInOnScroll(): React.RefCallback<HTMLElement> {
  const observer = useRef<IntersectionObserver | null>(null);

  const getObserver = (): IntersectionObserver => {
    if (!observer.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('landing-visible');
              observer.current?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
      );
    }
    return observer.current;
  };

  useEffect(() => {
    if (window.location.hash) {
      const sections = document.querySelectorAll('.landing-fade-in');
      for (const section of sections) {
        section.classList.add('landing-visible');
      }
    }

    return (): void => {
      observer.current?.disconnect();
    };
  }, []);

  return (el: HTMLElement | null): void => {
    if (el) {
      getObserver().observe(el);
    }
  };
}
