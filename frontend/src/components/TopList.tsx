import React, { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Chip,
    Avatar,
} from "@mui/material";
import { profileApi } from "../utils/auth"; // Используем profileApi
import { TopOut, ProfileOut } from "../types"; // Используем типы

const TopList: React.FC = () => {
    const [topData, setTopData] = useState<
        (TopOut & { master_profile?: ProfileOut })[]
    >([]); // Добавим поле для профиля мастера
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [cityFilter, setCityFilter] = useState<string>(""); // Поле для фильтрации по городу
    const [filteredTop, setFilteredTop] = useState<
        (TopOut & { master_profile?: ProfileOut })[]
    >([]);

    // Загрузка топа при монтировании
    useEffect(() => {
        const fetchTop = async () => {
            try {
                // Важно: передаём city только если он не пустой
                const params: { city?: string } = {};
                if (cityFilter.trim()) {
                    // trim() на всякий случай, если вдруг пробелы
                    params.city = cityFilter.trim();
                }
                const response = await profileApi.get<TopOut[]>(
                    "/profile/tops",
                    { params }
                );
                const topList = response.data;

                // Для MVP: просто добавим базовую информацию
                setTopData(topList);
                setFilteredTop(topList); // Так как фильтрация теперь на сервере
                setError(null);
            } catch (err: any) {
                console.error("Error fetching top:", err);
                // Проверяем, является ли detail строкой, иначе преобразуем или используем общее сообщение
                let errorMessage = "Ошибка загрузки топа";
                if (
                    err.response &&
                    err.response.data &&
                    typeof err.response.data.detail === "string"
                ) {
                    errorMessage = err.response.data.detail;
                } else if (
                    err.response &&
                    err.response.data &&
                    typeof err.response.data.detail === "object"
                ) {
                    // Если detail - объект (например, ошибка валидации), можно попробовать его строкифицировать
                    try {
                        errorMessage = JSON.stringify(err.response.data.detail);
                    } catch {
                        errorMessage =
                            "Ошибка загрузки топа (данные ошибки не строка)";
                    }
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchTop();
    }, [cityFilter]); // Зависимость от cityFilter, чтобы перезапрашивать при изменении фильтра

    // Применение фильтра по городу (уже не нужно в useEffect fetch, т.к. делаем это в запросе)
    // useEffect(() => {
    //     if (!cityFilter) {
    //         setFilteredTop(topData);
    //     } else {
    //         const filtered = topData.filter(item => item.city.toLowerCase().includes(cityFilter.toLowerCase()));
    //         setFilteredTop(filtered);
    //     }
    // }, [cityFilter, topData]);

    // Функция для получения имени мастера (в реальности можно подгружать профиль отдельно)
    // Для MVP, пока не подгружаем профиль, просто покажем ID или добавим заглушку
    const getMasterName = (masterId: string) => {
        // В идеале, это имя должно приходить из профиля мастера.
        // Либо бэкенд в TopOut должен возвращать имя/никнейм.
        // Пока просто возвращаем ID или "Мастер X"
        return `Мастер ${masterId.slice(0, 8)}`; // Пример: отображение части ID
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Топ Мастеров
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Box
                    sx={{
                        mb: 2,
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    <TextField
                        label="Фильтр по городу"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ flexGrow: 1 }}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => setCityFilter("")}
                        disabled={!cityFilter}
                    >
                        Сбросить
                    </Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Позиция</TableCell>
                                <TableCell>Мастер</TableCell>
                                <TableCell>Город</TableCell>
                                <TableCell align="right">Счёт</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTop.length > 0 ? (
                                filteredTop.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell component="th" scope="row">
                                            <Chip
                                                label={item.position}
                                                color="primary"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {/* TODO: Сделать кликабельным на профиль мастера */}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Avatar
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        mr: 1,
                                                    }}
                                                >
                                                    {/* TODO: Загрузить аватар из профиля мастера */}
                                                    {getMasterName(
                                                        item.master_id
                                                    ).charAt(0)}
                                                </Avatar>
                                                {getMasterName(item.master_id)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{item.city}</TableCell>
                                        <TableCell align="right">
                                            {item.score.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        Топ пуст или не найдено по фильтру
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
};

export default TopList;
