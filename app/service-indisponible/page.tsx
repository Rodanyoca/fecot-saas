import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ServiceUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-amber-600" />
          <CardTitle>Service momentanément indisponible</CardTitle>
          <CardDescription>
            Votre session n’a pas été supprimée. Le service de données n’a pas pu confirmer
            temporairement votre accès.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/competitions">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
