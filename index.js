require('dotenv').config();
const express = require('express');
const axios = require('axios');
//per vedere la GOOGLE_API_KEY nel file env ho dovuto installare npm install dotenv

const app = express();
app.use(express.json());
const PORT = 3000;

// Funzione per cercare hotel in una città specifica
async function getHotels(city) {
    try {
        if (isNaN(city)) {
            // Ottengo le coordinate della città usando Google Geocoding API
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${process.env.GOOGLE_API_KEY}`;

            console.log("geocodeUrl:" + geocodeUrl);
            const geocodeResponse = await axios.get(geocodeUrl);
            console.log("geocodeResponse:" + geocodeResponse);
            if (!geocodeResponse.data.results.length) {
                throw new Error("Città non trovata");
            }

            const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
            console.log("lat:" + lat);
            console.log("lng:" + lng);
            
            // uso Places API per cercare gli hotel vicino alla posizione trovata
            const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=lodging&key=${process.env.GOOGLE_API_KEY}`;
            console.log('placesUrl:' + placesUrl);
            const placesResponse = await axios.get(placesUrl);
            console.log("step1");
            if (placesResponse.data.results.length > 0) {
                console.log("hotel trovati");
                return placesResponse.data.results.map(hotel => ({
                    name: hotel.name,
                    address: hotel.vicinity,
                    rating: hotel.rating,
                    user_ratings_total: hotel.user_ratings_total
                }));
            }
            else{
                console.log("hotel non trovati");
                return [];
            }
        }
        else {
            throw new Error("Inserire la città da ricercare");
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// endpoint dove recupero gli hotel in base a una città
app.get('/hotels', async (req, res) => {
    const city = req.query.city;

    if (!city) {
        return res.status(400).json({ error: 'Parametro "city" mancante' });
    }

    try {
        const hotels = await getHotels(city);
        console.log("hotels:" + hotels);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero degli hotel' });
    }
});

app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
