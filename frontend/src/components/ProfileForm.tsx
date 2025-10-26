import React, { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    Paper,
    Grid,
} from "@mui/material";
import { profileApi } from "../utils/auth"; // Импортируем profileApi из auth.js
import { ProfileOut } from "../types"; // Используем тип из types/index.ts

// Используем ProfileOut вместо ProfileOutExtended
type ProfileFormData = Pick<ProfileOut, "bio" | "slug" | "wishes">;

const ProfileForm: React.FC = () => {
    const [formData, setFormData] = useState<ProfileFormData>({
        bio: "",
        slug: "",
        wishes: {},
    });
    const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Загрузка текущего профиля при монтировании
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // ВАЖНО: используем profileApi и путь /profile/me
                const response = await profileApi.get<ProfileOut>(
                    "/profile/me"
                );
                const { bio, slug, wishes } = response.data;
                setFormData({
                    bio: bio || "",
                    slug: slug || "",
                    wishes: wishes || {},
                });
                setError(null);
                setInitialDataLoaded(true); // Отмечаем, что данные загружены
            } catch (err: any) {
                // Проверяем, является ли ошибка 404 (профиль не найден)
                if (err.response?.status === 404) {
                    console.log("Profile not found, starting with empty data.");
                    // Не устанавливаем error, просто продолжаем с пустыми данными
                    setError(null);
                    setInitialDataLoaded(true); // Считаем, что начальное состояние загружено (пустое)
                } else {
                    console.error("Error fetching profile:", err);
                    setError(
                        err.response?.data?.detail || "Ошибка загрузки профиля"
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Обработчик для JSON поля wishes (упрощённый)
    const handleWishesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const parsed = e.target.value ? JSON.parse(e.target.value) : {};
            setFormData((prev) => ({
                ...prev,
                wishes: parsed,
            }));
        } catch {
            // Можно добавить валидацию или оставить как есть для MVP
            console.warn("Invalid JSON in wishes field");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initialDataLoaded) {
            // Не отправляем, если данные ещё не загружены, чтобы не затереть их
            console.warn("Profile data not loaded yet, cannot submit.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Подготовим только изменяемые поля для отправки
        const profileUpdateData = {
            bio: formData.bio,
            slug: formData.slug,
            wishes: formData.wishes,
        };

        try {
            // Отправляем PATCH/POST на /profile (upsert)
            // Бэкенд обновит или создаст профиль
            await profileApi.post("/profile", profileUpdateData);
            setSuccess("Профиль успешно обновлён!");
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.response?.data?.detail || "Ошибка обновления профиля");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="md">
                <Box sx={{ mt: 4, textAlign: "center" }}>
                    <Typography variant="h6">Загрузка профиля...</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Редактировать профиль
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        <Grid>
                            <TextField
                                fullWidth
                                name="bio"
                                label="О себе"
                                multiline
                                rows={4}
                                value={formData.bio}
                                onChange={handleChange}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid>
                            <TextField
                                fullWidth
                                name="slug"
                                label="Адрес профиля (slug)"
                                value={formData.slug}
                                onChange={handleChange}
                                variant="outlined"
                                helperText="Уникальный адрес для вашего профиля (например, nishlen.ru/beautyMaster)"
                                // TODO: Проверить, можно ли менять slug на бэкенде. Если нет, сделать readonly/disabled.
                                // Если можно, добавить валидацию на уникальность.
                            />
                        </Grid>
                        <Grid>
                            <TextField
                                fullWidth
                                name="wishes"
                                label="Пожелания (JSON)"
                                value={JSON.stringify(formData.wishes)}
                                onChange={handleWishesChange}
                                variant="outlined"
                                multiline
                                rows={2}
                                helperText="Ваши пожелания в формате JSON (например, {'{'}} 'аллергия': 'на X', 'предпочитаю': 'Y' {'}'} )"
                            />
                        </Grid>
                        <Grid>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                fullWidth
                            >
                                {loading
                                    ? "Сохранение..."
                                    : "Сохранить профиль"}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
};

export default ProfileForm;
