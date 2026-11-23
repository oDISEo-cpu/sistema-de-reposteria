--
-- PostgreSQL database dump
--

\restrict ARtzyX5mgwiJpJjkZ00phTWQSxbPIXSEGk0C9jusjoeNvZgJg00dPAITf0Dw3Te

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.receta_ingredientes DROP CONSTRAINT IF EXISTS receta_ingredientes_receta_id_fkey;
ALTER TABLE IF EXISTS ONLY public.receta_ingredientes DROP CONSTRAINT IF EXISTS receta_ingredientes_inventario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pedido_detalle DROP CONSTRAINT IF EXISTS pedido_detalle_receta_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pedido_detalle DROP CONSTRAINT IF EXISTS pedido_detalle_pedido_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS pagos_pedido_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ordenes_produccion DROP CONSTRAINT IF EXISTS ordenes_produccion_receta_id_fkey;
DROP INDEX IF EXISTS public.idx_pedido_detalle_pedido;
DROP INDEX IF EXISTS public.idx_pagos_pedido;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE IF EXISTS ONLY public.recetas DROP CONSTRAINT IF EXISTS recetas_pkey;
ALTER TABLE IF EXISTS ONLY public.receta_ingredientes DROP CONSTRAINT IF EXISTS receta_ingredientes_receta_id_inventario_id_key;
ALTER TABLE IF EXISTS ONLY public.receta_ingredientes DROP CONSTRAINT IF EXISTS receta_ingredientes_pkey;
ALTER TABLE IF EXISTS ONLY public.pedidos DROP CONSTRAINT IF EXISTS pedidos_pkey;
ALTER TABLE IF EXISTS ONLY public.pedido_detalle DROP CONSTRAINT IF EXISTS pedido_detalle_pkey;
ALTER TABLE IF EXISTS ONLY public.pedido_detalle DROP CONSTRAINT IF EXISTS pedido_detalle_pedido_id_receta_id_key;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS pagos_pkey;
ALTER TABLE IF EXISTS ONLY public.ordenes_produccion DROP CONSTRAINT IF EXISTS ordenes_produccion_pkey;
ALTER TABLE IF EXISTS ONLY public.inventario DROP CONSTRAINT IF EXISTS inventario_pkey;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.recetas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.receta_ingredientes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.pedidos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.pedido_detalle ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.pagos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ordenes_produccion ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventario ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.usuarios_id_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.recetas_id_seq;
DROP TABLE IF EXISTS public.recetas;
DROP SEQUENCE IF EXISTS public.receta_ingredientes_id_seq;
DROP TABLE IF EXISTS public.receta_ingredientes;
DROP SEQUENCE IF EXISTS public.pedidos_id_seq;
DROP TABLE IF EXISTS public.pedidos;
DROP SEQUENCE IF EXISTS public.pedido_detalle_id_seq;
DROP TABLE IF EXISTS public.pedido_detalle;
DROP SEQUENCE IF EXISTS public.pagos_id_seq;
DROP TABLE IF EXISTS public.pagos;
DROP SEQUENCE IF EXISTS public.ordenes_produccion_id_seq;
DROP TABLE IF EXISTS public.ordenes_produccion;
DROP SEQUENCE IF EXISTS public.inventario_id_seq;
DROP TABLE IF EXISTS public.inventario;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: inventario; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    nombre_producto character varying(100) NOT NULL,
    categoria character varying(50) NOT NULL,
    stock numeric(10,2) DEFAULT 0 NOT NULL,
    unidad_medida character varying(20) NOT NULL,
    precio_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    stock_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventario OWNER TO miusuario;

--
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_seq OWNER TO miusuario;

--
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- Name: ordenes_produccion; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.ordenes_produccion (
    id integer NOT NULL,
    receta_id integer,
    receta_nombre character varying(100) NOT NULL,
    cantidad integer NOT NULL,
    costo_total numeric(12,2) DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ordenes_produccion_cantidad_check CHECK ((cantidad > 0))
);


ALTER TABLE public.ordenes_produccion OWNER TO miusuario;

--
-- Name: ordenes_produccion_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.ordenes_produccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordenes_produccion_id_seq OWNER TO miusuario;

--
-- Name: ordenes_produccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.ordenes_produccion_id_seq OWNED BY public.ordenes_produccion.id;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    metodo character varying(20) DEFAULT 'efectivo'::character varying NOT NULL,
    referencia character varying(100),
    pagado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pagos_metodo_check CHECK (((metodo)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'pago_movil'::character varying])::text[]))),
    CONSTRAINT pagos_monto_check CHECK ((monto > (0)::numeric))
);


ALTER TABLE public.pagos OWNER TO miusuario;

--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_id_seq OWNER TO miusuario;

--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: pedido_detalle; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.pedido_detalle (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    receta_id integer NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    costo_unitario numeric(12,4) DEFAULT 0 NOT NULL,
    CONSTRAINT pedido_detalle_cantidad_check CHECK ((cantidad > (0)::numeric))
);


ALTER TABLE public.pedido_detalle OWNER TO miusuario;

--
-- Name: pedido_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.pedido_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedido_detalle_id_seq OWNER TO miusuario;

--
-- Name: pedido_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.pedido_detalle_id_seq OWNED BY public.pedido_detalle.id;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    cliente character varying(150) NOT NULL,
    telefono character varying(30),
    fecha_entrega date,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    notas text,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pedidos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'listo'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[])))
);


ALTER TABLE public.pedidos OWNER TO miusuario;

--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedidos_id_seq OWNER TO miusuario;

--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: receta_ingredientes; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.receta_ingredientes (
    id integer NOT NULL,
    receta_id integer NOT NULL,
    inventario_id integer NOT NULL,
    cantidad numeric(10,3) NOT NULL,
    CONSTRAINT receta_ingredientes_cantidad_check CHECK ((cantidad > (0)::numeric))
);


ALTER TABLE public.receta_ingredientes OWNER TO miusuario;

--
-- Name: receta_ingredientes_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.receta_ingredientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receta_ingredientes_id_seq OWNER TO miusuario;

--
-- Name: receta_ingredientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.receta_ingredientes_id_seq OWNED BY public.receta_ingredientes.id;


--
-- Name: recetas; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.recetas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    precio_venta numeric(10,2) DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recetas OWNER TO miusuario;

--
-- Name: recetas_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.recetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recetas_id_seq OWNER TO miusuario;

--
-- Name: recetas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.recetas_id_seq OWNED BY public.recetas.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: miusuario
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    rol character varying(50) DEFAULT 'empleado'::character varying,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO miusuario;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: miusuario
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO miusuario;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: miusuario
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- Name: ordenes_produccion id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.ordenes_produccion ALTER COLUMN id SET DEFAULT nextval('public.ordenes_produccion_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: pedido_detalle id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedido_detalle ALTER COLUMN id SET DEFAULT nextval('public.pedido_detalle_id_seq'::regclass);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Name: receta_ingredientes id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.receta_ingredientes ALTER COLUMN id SET DEFAULT nextval('public.receta_ingredientes_id_seq'::regclass);


--
-- Name: recetas id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.recetas ALTER COLUMN id SET DEFAULT nextval('public.recetas_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.inventario (id, nombre_producto, categoria, stock, unidad_medida, precio_unitario, stock_minimo, actualizado_en) FROM stdin;
1	Harina de trigo	Harinas	24.75	kg	1.20	5.00	2026-11-17 22:12:42.004749
2	Azucar	Azúcares	19.80	kg	1.10	5.00	2026-11-17 22:12:42.004749
3	Mantequilla	Grasas	7.85	kg	7.50	2.00	2026-11-17 22:12:42.004749
4	Huevos	Huevos	117.00	unidad	0.25	30.00	2026-11-17 22:12:42.004749
5	Leche	Lácteos	14.80	l	1.00	4.00	2026-11-17 22:12:42.004749
6	Chocolate de cobertura	Chocolates	5.80	kg	9.00	1.00	2026-11-17 22:12:42.004749
\.


--
-- Data for Name: ordenes_produccion; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.ordenes_produccion (id, receta_id, receta_nombre, cantidad, costo_total, creado_en) FROM stdin;
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.pagos (id, pedido_id, monto, metodo, referencia, pagado_en) FROM stdin;
\.


--
-- Data for Name: pedido_detalle; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.pedido_detalle (id, pedido_id, receta_id, cantidad, precio_unitario, costo_unitario) FROM stdin;
1	1	1	1.00	11.00	4.3950
\.


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.pedidos (id, cliente, telefono, fecha_entrega, estado, notas, total, creado_en, actualizado_en) FROM stdin;
1	Jhonjairo	04125846587	2026-11-17	pendiente	\N	11.00	2026-11-17 22:12:42.004749	2026-11-17 22:12:42.004749
\.


--
-- Data for Name: receta_ingredientes; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.receta_ingredientes (id, receta_id, inventario_id, cantidad) FROM stdin;
1	1	1	0.250
2	1	2	0.200
3	1	3	0.150
4	1	4	3.000
5	1	5	0.200
6	1	6	0.200
\.


--
-- Data for Name: recetas; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.recetas (id, nombre, descripcion, precio_venta, creado_en) FROM stdin;
1	Torta de chocolate	Torta húmeda de chocolate con cobertura, 8 porciones	11.00	2026-11-17 21:35:58.520629
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: miusuario
--

COPY public.usuarios (id, nombre, email, password, rol, creado_en) FROM stdin;
1	Rei	Rei@gmail.com	$2b$10$9E3HkKUD.KeDqjgpu.B0Huybh1NxdCLbAQaqu1M.l3ocfjP8Ro6IO	repostero	2026-11-16 22:18:46.141139
2	jhonjairo	carusijhonjairo@gmail.com	$2b$10$wjD22.XQNsMlOYpl5OgJVuSVNnneyWE8l9QIpwOlfgjtKXifZqXBu	empleado	2026-11-16 22:53:46.987894
\.


--
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.inventario_id_seq', 6, true);


--
-- Name: ordenes_produccion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.ordenes_produccion_id_seq', 1, false);


--
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.pagos_id_seq', 1, false);


--
-- Name: pedido_detalle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.pedido_detalle_id_seq', 1, true);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 1, true);


--
-- Name: receta_ingredientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.receta_ingredientes_id_seq', 6, true);


--
-- Name: recetas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.recetas_id_seq', 1, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: miusuario
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 2, true);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- Name: ordenes_produccion ordenes_produccion_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: pedido_detalle pedido_detalle_pedido_id_receta_id_key; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedido_detalle
    ADD CONSTRAINT pedido_detalle_pedido_id_receta_id_key UNIQUE (pedido_id, receta_id);


--
-- Name: pedido_detalle pedido_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedido_detalle
    ADD CONSTRAINT pedido_detalle_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: receta_ingredientes receta_ingredientes_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_pkey PRIMARY KEY (id);


--
-- Name: receta_ingredientes receta_ingredientes_receta_id_inventario_id_key; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_receta_id_inventario_id_key UNIQUE (receta_id, inventario_id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_pagos_pedido; Type: INDEX; Schema: public; Owner: miusuario
--

CREATE INDEX idx_pagos_pedido ON public.pagos USING btree (pedido_id);


--
-- Name: idx_pedido_detalle_pedido; Type: INDEX; Schema: public; Owner: miusuario
--

CREATE INDEX idx_pedido_detalle_pedido ON public.pedido_detalle USING btree (pedido_id);


--
-- Name: ordenes_produccion ordenes_produccion_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE SET NULL;


--
-- Name: pagos pagos_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE RESTRICT;


--
-- Name: pedido_detalle pedido_detalle_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedido_detalle
    ADD CONSTRAINT pedido_detalle_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedido_detalle pedido_detalle_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.pedido_detalle
    ADD CONSTRAINT pedido_detalle_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE RESTRICT;


--
-- Name: receta_ingredientes receta_ingredientes_inventario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id) ON DELETE RESTRICT;


--
-- Name: receta_ingredientes receta_ingredientes_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: miusuario
--

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ARtzyX5mgwiJpJjkZ00phTWQSxbPIXSEGk0C9jusjoeNvZgJg00dPAITf0Dw3Te

