Implementation Guide

Placement: Copy and paste this script into the <head> section of your homepage.

Customization: * Replace the placeholder image URLs with your actual logo and clinic photo links.

Update the reviewCount to match exactly what you have on Google Maps.


<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "@id": "https://i-smile.gr/#dentist",
  "name": "i-smile Cosmetic Dentistry",
  "url": "https://i-smile.gr",
  "telephone": "+302109312651",
  "priceRange": "$$",
  "image": "https://i-smile.gr/assets/images/hero-smile.webp",
  "logo": "https://i-smile.gr/assets/images/logo.webp",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Plateia Ntavari 2",
    "addressLocality": "Palaio Faliro",
    "postalCode": "17563",
    "addressCountry": "GR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.9221, 
    "longitude": 23.6967
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "10:00",
      "closes": "20:00"
    }
  ],
  "parentOrganization": {
    "@type": "MedicalOrganization",
    "name": "Dentplant Clinic",
    "url": "https://dentplant.gr"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Cosmetic Dental Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Teeth Whitening (Λεύκανση Δοντιών)"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Porcelain Veneers (Όψεις Πορσελάνης)"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Clear Aligners (Διάφανοι Νάρθηκες)"
        }
      }
    ]
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "25",
    "bestRating": "5"
  }
}
</script>