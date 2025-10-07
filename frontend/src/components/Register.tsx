import React, { useState } from "react";
import {
    Button,
    TextField,
    Container,
    Typography,
    Box,
    Alert,
} from "@mui/material";
import { api } from "../utils/auth";

const Register: React.FC = () => {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

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
                    role: "client", // По умолчанию для клиентов
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
