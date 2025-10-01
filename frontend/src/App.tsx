import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";

const theme = createTheme({
    palette: { primary: { main: "#FF6B6B" } }, // Розовый для beauty
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route
                        path="/"
                        element={<div>Welcome to Nishlen.ru! ✨</div>}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/dashboard"
                        element={
                            <div>
                                Добро пожаловать, !{" "}
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.href = "/login";
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        }
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
