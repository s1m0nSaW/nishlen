import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Box,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import { ListItemButton } from "@mui/material"; // Добавь импорт
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { bookingApi } from "../utils/auth";
import { ServiceOut, ScheduleOut } from "../types";

const BookingForm: React.FC = () => {
    const { masterId } = useParams<{ masterId: string }>();
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [slots, setSlots] = useState<ScheduleOut[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<ScheduleOut | null>(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<ServiceOut[]>([]);

    useEffect(() => {
        if (masterId) {
            const cleanMasterId = masterId.replace(":", ""); // Фикс: trim :
            // Fetch services
            bookingApi
                .get("/booking/services", {
                    params: { master_id: cleanMasterId },
                })
                .then((res) => setServices(res.data));

            // Fetch slots
            if (selectedDate) {
                const targetDate = format(selectedDate, "yyyy-MM-dd");
                bookingApi
                    .get("/booking/slots", {
                        params: { master_id: cleanMasterId, date: targetDate },
                    })
                    .then((res) => setSlots(res.data))
                    .catch((err) => console.error("Slots error:", err));
            }
        }
    }, [masterId, selectedDate]);

    const handleBook = () => {
        if (!selectedSlot || !services[0]?.id) return;
        setLoading(true);
        bookingApi
            .post("/booking/book", {
                master_id: masterId,
                service_id: services[0].id,
                schedule_id: selectedSlot.id,
                notes,
            })
            .then((res) => {
                console.log("Booking created:", res.data);
                navigate("/dashboard");
            })
            .catch((err) => console.error("Booking error:", err))
            .finally(() => setLoading(false));
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md">
                <Box sx={{ mt: 8 }}>
                    <Typography variant="h4">
                        Запись к мастеру {masterId}
                    </Typography>
                    <DateTimePicker
                        label="Дата"
                        value={selectedDate}
                        onChange={setSelectedDate}
                        sx={{ mt: 2, width: "100%" }}
                    />
                    <Typography sx={{ mt: 2 }}>Доступные слоты:</Typography>
                    <List sx={{ mt: 1 }}>
                        {slots.map((slot) => (
                            <ListItem key={slot.id} disablePadding>
                                <ListItemButton // Фикс: ListItemButton вместо ListItem + component
                                    selected={selectedSlot?.id === slot.id} // selected OK
                                    onClick={() => setSelectedSlot(slot)}
                                >
                                    <ListItemText
                                        primary={`${slot.start_time} - ${slot.end_time}`}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <TextField
                        fullWidth
                        label="Пожелания"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        multiline
                        rows={3}
                    />
                    <Button
                        variant="contained"
                        onClick={handleBook}
                        disabled={!selectedSlot || loading}
                        sx={{ mt: 2 }}
                    >
                        Записаться
                    </Button>
                </Box>
            </Container>
        </LocalizationProvider>
    );
};

export default BookingForm;
