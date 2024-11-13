require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// recupero i dettagli di una struttura ricettiva
async function getAccommodationDetails(placeId) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,website,international_phone_number&key=${process.env.GOOGLE_API_KEY}`;
    const detailsResponse = await axios.get(detailsUrl);
    const accommodation = detailsResponse.data.result;
    return {
        name: accommodation.name,
        address: accommodation.formatted_address,
        rating: accommodation.rating,
        user_ratings_total: accommodation.user_ratings_total,
        website: accommodation.website || 'Non disponibile',
        phone: accommodation.international_phone_number || 'Non disponibile'
    };
}

// cerco alloggi (hotel e altre strutture)
async function getAccommodations(city, radius) {
    try {
        // Ottengo le coordinate della città usando Google Geocoding API
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${process.env.GOOGLE_API_KEY}`;
        const geocodeResponse = await axios.get(geocodeUrl);

        if (!geocodeResponse.data.results.length) {
            throw new Error("Città non trovata");
        }

        const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

        // prima richiesta: ottengo gli hotel e strutture simili
        const hotelsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=lodging&key=${process.env.GOOGLE_API_KEY}`;
        const hotelsResponse = await axios.get(hotelsUrl);

        // seconda richiesta: cerco altre strutture ricettive specifiche (B&B, agriturismi, case vacanze)
        const otherAccommodationsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=bed and breakfast|agriturismo|case vacanze|resort&key=${process.env.GOOGLE_API_KEY}`;
        const otherAccommodationsResponse = await axios.get(otherAccommodationsUrl);

        // combino i risultati, evitando duplicati basati su place_id
        const allAccommodations = [
            ...hotelsResponse.data.results,
            ...otherAccommodationsResponse.data.results.filter(
                other => !hotelsResponse.data.results.some(hotel => hotel.place_id === other.place_id)
            )
        ];

        // recupero i dettagli per ciascuna struttura combinata
        const accommodationDetailsPromises = allAccommodations.map(async place => {
            return await getAccommodationDetails(place.place_id);
        });

        return await Promise.all(accommodationDetailsPromises);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Endpoint per recuperare alloggi in base a una città
app.get('/accommodations', async (req, res) => {
    const city = req.query.city;
    const radius = req.query.radius;
    if (!city || !radius) {
        return res.status(400).json({ error: 'Parametro "city" o "radius" mancanti' });
    }

    try {
        const accommodations = await getAccommodations(city, radius);
        console.log(accommodations);
        res.json(accommodations);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli alloggi' });
    }
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
