import React, { useState } from "react";
import {
    Button,
    TextField,
    Container,
    Typography,
    Box,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import { api } from "../utils/auth";

const Register: React.FC = () => {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [role, setRole] = useState("client");
    const [photoUrl, setPhotoUrl] = useState("");
    const [city, setCity] = useState("");
    const [salonName, setSalonName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }
        if (password.length < 6) {
            setError("Пароль слишком короткий (мин. 6 символов)");
            return;
        }
        try {
            await api
                .post("/auth/register", {
                    phone,
                    password,
                    full_name: fullName,
                    role,
                    ...(role === "master" && { photo_url: photoUrl, city }),
                    ...(role === "salon_admin" && { salon_name: salonName }),
                })
                .then((res) => {
                    localStorage.setItem("token", res.data.token);
                    console.log("User:", res.data.user);
                    setSuccess(true);
                    setError("");
                    window.location.href = "/login";
                });
        } catch (err: any) {
            setError(err.response?.data?.error || "Ошибка регистрации");
            setSuccess(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    mt: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Typography variant="h4">Регистрация в Nishlen</Typography>
                {error && (
                    <Alert severity="error" sx={{ mt: 2, width: "100%" }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mt: 2, width: "100%" }}>
                        Регистрация успешна! Войдите в аккаунт.
                    </Alert>
                )}
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ mt: 1, width: "100%" }}
                >
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="ФИО"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Телефон (+7...)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        inputProps={{ minLength: 6 }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Подтвердите пароль"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Роль</InputLabel>
                        <Select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            label="Роль"
                        >
                            <MenuItem value="client">Клиент</MenuItem>
                            <MenuItem value="master">Мастер</MenuItem>
                            <MenuItem value="salon_admin">
                                Админ салона
                            </MenuItem>
                        </Select>
                    </FormControl>
                    {role === "master" && (
                        <>
                            <TextField
                                fullWidth
                                label="Фото URL"
                                value={photoUrl}
                                onChange={(e) => setPhotoUrl(e.target.value)}
                                sx={{ mt: 1 }}
                            />
                            <TextField
                                fullWidth
                                label="Город"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                sx={{ mt: 1 }}
                            />
                        </>
                    )}

                    {role === "salon_admin" && (
                        <TextField
                            fullWidth
                            label="Название салона"
                            value={salonName}
                            onChange={(e) => setSalonName(e.target.value)}
                            sx={{ mt: 1 }}
                        />
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3 }}
                    >
                        Зарегистрироваться
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default Register;
