require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// recupero i dettagli di un hotel inclusi email e sito web
async function getHotelDetails(placeId) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,website,international_phone_number&key=${process.env.GOOGLE_API_KEY}`;
    const detailsResponse = await axios.get(detailsUrl);
    const hotel = detailsResponse.data.result;
    return {
        name: hotel.name,
        address: hotel.formatted_address,
        rating: hotel.rating,
        user_ratings_total: hotel.user_ratings_total,
        website: hotel.website || 'Non disponibile',
        phone: hotel.international_phone_number || 'Non disponibile'
    };
}

// cerco hotel in una città specifica
async function getHotels(city,radius) {
    try {
        // ottengo le coordinate della città usando Google Geocoding API
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${process.env.GOOGLE_API_KEY}`;
        const geocodeResponse = await axios.get(geocodeUrl);

        if (!geocodeResponse.data.results.length) {
            throw new Error("Città non trovata");
        }

        const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

        // uso Places API per cercare gli hotel vicino alla posizione trovata
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=lodging&key=${process.env.GOOGLE_API_KEY}`;
        const placesResponse = await axios.get(placesUrl);

        // Otteniamo i dettagli per ciascun hotel trovato
        const hotelDetailsPromises = placesResponse.data.results.map(async hotel => {
            return await getHotelDetails(hotel.place_id);
        });

        return await Promise.all(hotelDetailsPromises);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// endpoint per recuperare gli hotel in base a una città
app.get('/hotels', async (req, res) => {
    const city = req.query.city;
    const radius = req.query.radius;
    if (!city || !radius) {
        return res.status(400).json({ error: 'Parametro "city" o "radius" mancanti' });
    }

    try {
        const hotels = await getHotels(city,radius);
        console.log(hotels);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli hotel' });
    }
});

app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
