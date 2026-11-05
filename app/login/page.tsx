"use client"

import { apiFetch } from "@/lib/api/client"

import Image from "next/image"
import { useRef, useState } from "react"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react"

import { normalizeLoginRedirect } from "@/lib/auth/login-redirect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "./login.module.css"

type LoginError = "credentials" | "service" | "validation" | null
type SubmissionPhase = "idle" | "request" | "redirect"

const errorMessages: Record<Exclude<LoginError, null>, string> = {
  credentials: "Les informations saisies ne permettent pas d’accéder au système. Vérifiez votre adresse e-mail et votre mot de passe.",
  service: "Le service de connexion est momentanément indisponible. Veuillez réessayer dans quelques instants.",
  validation: "Vérifiez les informations saisies puis réessayez.",
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [phase, setPhase] = useState<SubmissionPhase>("idle")
  const [error, setError] = useState<LoginError>(null)
  const submissionLocked = useRef(false)
  const loading = phase !== "idle"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionLocked.current) return
    submissionLocked.current = true
    setError(null)
    setPhase("request")
    let authenticated = false

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setError("credentials")
        else if (response.status === 400) setError("validation")
        else setError("service")
        return
      }

      const result = await response.json()
      authenticated = true
      setPhase("redirect")
      // Une connexion change l'état d'authentification côté serveur. Une
      // navigation complète évite de réutiliser un arbre RSC préchargé avant
      // la pose du cookie de session, ce qui provoquait un retour vers /login.
      window.location.replace(normalizeLoginRedirect(result.redirectTo))
    } catch {
      setError("service")
    } finally {
      if (!authenticated) {
        submissionLocked.current = false
        setPhase("idle")
      }
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="institution-title">
        <Image unoptimized src="/1120345-1920x1280-desktop-hd-taekwondo-background-photo.jpg" alt="Deux pratiquants de taekwondo à l’entraînement" fill priority sizes="(max-width: 1023px) 100vw, 62vw" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.brandLockup}>
            <div className={styles.brandLogo}>
              <Image unoptimized src="/logo-fecot.png" alt="Logo de la Fédération congolaise de taekwondo" fill sizes="64px" className={styles.brandLogoImage} />
            </div>
            <div>
              <p className={styles.brandName}>FECOT</p>
              <p className={styles.brandCountry}>Fédération de Taekwondo du Congo</p>
            </div>
          </div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Institution sportive nationale</p>
            <h1 id="institution-title">Ensemble, portons plus haut les couleurs de la RDC.</h1>
            <p className={styles.introduction}>Une plateforme fédérale dédiée aux structures, aux acteurs et au développement du taekwondo congolais.</p>
          </div>
        </div>
        <div className={styles.nationalLine} aria-hidden="true" />
      </section>

      <aside className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.panelContent}>
          <div className={styles.mobileBrand}><Image unoptimized src="/logo-fecot.png" alt="FECOT" width={48} height={48} /><strong>FECOT</strong></div>
          <div className={styles.welcome}>
            <p className={styles.panelEyebrow}>Fédération de Taekwondo du Congo</p>
            <h2 id="login-title">Espace institutionnel</h2>
            <p>Connectez-vous pour accéder à la plateforme de gestion du taekwondo congolais.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
            <div className={styles.field}>
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className={styles.inputWrap}>
                <Mail aria-hidden="true" />
                <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} aria-invalid={error === "credentials" || error === "validation"} required />
              </div>
            </div>

            <div className={styles.field}>
              <Label htmlFor="password">Mot de passe</Label>
              <div className={styles.inputWrap}>
                <LockKeyhole aria-hidden="true" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} aria-invalid={error === "credentials" || error === "validation"} aria-describedby={error ? "login-error" : undefined} required />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className={styles.messageSlot}>
              {error && <p id="login-error" className={styles.error} role="alert">{errorMessages[error]}</p>}
            </div>
            <Button type="submit" className={styles.submit} disabled={loading}>
              {loading && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
              {phase === "redirect" ? "Redirection en cours…" : loading ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>

          <div className={styles.panelMeta}>
            <span>Version 1.0 · Accès sécurisé</span>
            <span>Administration FECOT</span>
          </div>
          <p className={styles.platformLabel}>Plateforme du référentiel sportif national</p>
          <p className={styles.signature} aria-label="Design par DS Concept"><span>Design by</span><strong>DS Concept</strong></p>
        </div>
      </aside>
    </main>
  )
}
