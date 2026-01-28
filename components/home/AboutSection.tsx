import { Button } from "@/components/ui/button"

export function AboutSection() {
    return (
        <footer className="bg-slate-900 text-slate-200 py-16">
            <div className="container px-4 md:px-6 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-6 font-serif">Story of Champaran Meat House</h2>
                    <p className="mb-4 leading-relaxed opacity-90">
                        Born from the rustic kitchens of Bihar, Champaran Meat House brings you the age-old tradition of <strong>Ahuna Mutton</strong>.
                        Slow-cooked in sealed earthen pots over charcoal, our meat retains its natural juices and distinct smoky flavor.
                    </p>
                    <p className="mb-6 leading-relaxed opacity-90">
                        We believe in authenticity. No shortcuts, just pure spices, quality meat, and patience.
                        Experience the taste that has traveled generations to reach your plate.
                    </p>
                    <div className="flex gap-4">
                        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                            Read Our Story
                        </Button>
                    </div>
                </div>
                <div className="relative h-[300px] rounded-2xl overflow-hidden shadow-2xl skew-y-3 transform border-4 border-slate-800">
                    <img
                        src="https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800&q=80"
                        alt="Cooking in Handi"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
            </div>

            <div className="container px-4 md:px-6 mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                © {new Date().getFullYear()} Champaran Meat House. All rights reserved.
            </div>
        </footer>
    )
}
