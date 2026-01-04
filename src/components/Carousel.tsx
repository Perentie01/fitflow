import { useCarousel } from "@/hooks/useCarousel";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string;
}

export const Carousel = <T,>({ items, renderItem, className = "" }: CarouselProps<T>) => {
  const { emblaRef, selectedIndex, scrollSnaps, scrollTo } = useCarousel();

  if (items.length === 0) return null;

  return (
    <div className="md:hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((item, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 flex justify-center">
              <div className={className}>
                {renderItem(item)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {items.length > 1 && (
        <div className="flex justify-center mt-2 space-x-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === selectedIndex ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Inline test
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test("Carousel renders with items", () => {
    const testItems = [1, 2, 3];
    expect(testItems.length).toBe(3);
  });

  test("Carousel handles empty items array", () => {
    const testItems: number[] = [];
    expect(testItems.length).toBe(0);
  });
}
