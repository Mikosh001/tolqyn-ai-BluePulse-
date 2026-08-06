import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLng } from "../lib/simulation";

interface Props {
  particles: LatLng[];
  color: string;
}

export default function ParticleCanvasLayer({ particles, color }: Props) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "450";
    canvasRef.current = canvas;
    map.getPanes().overlayPane.appendChild(canvas);

    const resize = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
    };

    resize();
    map.on("move zoom resize", resize);

    return () => {
      map.off("move zoom resize", resize);
      canvas.remove();
    };
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      particles.forEach((p) => {
        const pt = map.latLngToContainerPoint([p.lat, p.lng]);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();
  }, [particles, color, map]);

  return null;
}
