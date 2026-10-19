const CATEGORY_PHOTOS: Record<string, string> = {
  tickets: "/images/categories/tickets.jpg",
  home: "/images/categories/home.jpg",
  "business-equipment": "/images/categories/business-equipment.jpg",
  auto: "/images/categories/auto.jpg",
  electronics: "/images/categories/electronics.jpg",
  family: "/images/categories/family.jpg",
  pets: "/images/categories/pets.jpg",
  sports: "/images/categories/sports.jpg",
  "fashion-beauty": "/images/categories/fashion-beauty.jpg",
  books: "/images/categories/books.jpg",
  "give-away": "/images/categories/give-away.jpg",
};

export function categoryPhoto(id: string) {
  return CATEGORY_PHOTOS[id] ?? null;
}
