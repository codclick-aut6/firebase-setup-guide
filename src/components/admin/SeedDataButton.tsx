
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, Loader2 } from "lucide-react";
import { seedAllData } from "@/utils/seedFirebase";

export const SeedDataButton = () => {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    if (!window.confirm(
      "Isso irá LIMPAR todas as coleções existentes e recriar com dados iniciais.\n\n" +
      "ATENÇÃO: Todos os dados atuais serão perdidos!\n\n" +
      "Tem certeza que deseja continuar?"
    )) {
      return;
    }

    try {
      setIsSeeding(true);
      
      toast({
        title: "Iniciando...",
        description: "Limpando e recriando coleções do Firebase...",
      });

      const result = await seedAllData();
      
      toast({
        title: "Sucesso!",
        description: result.message,
      });
      
      // Recarregar a página após 2 segundos para atualizar os dados
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao recriar coleções:", error);
      toast({
        title: "Erro",
        description: `Não foi possível recriar as coleções: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button 
      onClick={handleSeedData} 
      disabled={isSeeding}
      variant="outline"
      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
    >
      {isSeeding ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Recriando...
        </>
      ) : (
        <>
          <Database className="h-4 w-4 mr-2" />
          Recriar Coleções Firebase
        </>
      )}
    </Button>
  );
};
