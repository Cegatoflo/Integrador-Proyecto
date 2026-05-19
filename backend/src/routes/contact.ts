import { Router, Request, Response } from "express";
import { sendContactEmail } from "../lib/email";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ error: "Todos los campos son requeridos" });
      return;
    }

    await sendContactEmail(name, email, message);

    res.json({ message: "Mensaje enviado exitosamente" });
  } catch (error) {
    console.error("Error en contact:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
