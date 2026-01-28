import { Card } from "@/components/ui/card"

export function RestaurantGallery() {
    const images = [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", // Restaurant interior
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80", // Food prep
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80", // Serving
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80"  // Ambiance
    ]

    return (
        <section className="py-12 bg-white">
            <div className="container px-4 md:px-6">
                <h2 className="text-2xl font-bold mb-6 text-center font-serif">Experience Our Ambience</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((src, i) => (
                        <div key={i} className="aspect-square relative overflow-hidden rounded-lg shadow-md group">
                            <img
                                src={src}
                                alt="Restaurant Ambience"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
