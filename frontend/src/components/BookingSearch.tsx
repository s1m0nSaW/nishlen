import React, { useState, useEffect } from "react";
import {
    Container,
    TextField,
    List,
    ListItem,
    ListItemText,
    Typography,
    Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { bookingApi } from "../utils/auth"; // Axios for booking

const BookingSearch: React.FC = () => {
    const [query, setQuery] = useState(""); // Поиск по городу/услуге
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (query) {
            setLoading(true);
            bookingApi
                .get("/booking/services", { params: { city: query } }) // Mock city as query
                .then((res) => setServices(res.data))
                .catch((err) => console.error("Search error:", err))
                .finally(() => setLoading(false));
        }
    }, [query]);

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 8 }}>
                <Typography variant="h4">Поиск услуг</Typography>
                <TextField
                    fullWidth
                    label="Город или услуга"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{ mt: 2 }}
                />
                {loading && <Typography>Загрузка...</Typography>}
                <List sx={{ mt: 2 }}>
                    {services.map((service: any) => (
                        <ListItem
                            key={service.id}
                            component="button"
                            onClick={() =>
                                navigate(`/book/${service.master_id}`)
                            }
                        >
                            <ListItemText
                                primary={service.name}
                                secondary={`Цена: ${service.price}₽ | Длительность: ${service.duration_min} мин`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Container>
    );
};

export default BookingSearch;
