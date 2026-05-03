
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Variation } from "@/types/menu";

export const getAllVariations = async (): Promise<Variation[]> => {
  try {
    console.log("Buscando todas as variações...");
    const variationsCollection = collection(db, "variations");
    const variationsSnapshot = await getDocs(query(variationsCollection));
    const variations = variationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Variation[];
    console.log("Variações carregadas:", variations.length);
    return variations;
  } catch (error) {
    console.error("Erro ao buscar variações:", error);
    throw error;
  }
};

export const getVariation = async (id: string): Promise<Variation | null> => {
  try {
    console.log("Buscando variação:", id);
    const variationDoc = doc(db, "variations", id);
    const variationSnapshot = await getDoc(variationDoc);

    if (variationSnapshot.exists()) {
      const variation = {
        id: variationSnapshot.id,
        ...variationSnapshot.data(),
      } as Variation;
      console.log("Variação encontrada:", variation);
      return variation;
    } else {
      console.log("Variação não encontrada");
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar variação:", error);
    throw error;
  }
};

// Alias for getVariation for better API naming consistency
export const getVariationById = getVariation;

export const saveVariation = async (variation: Variation): Promise<string> => {
  try {
    console.log("Salvando variação:", variation);
    
    // Validate required fields
    if (!variation.name) {
      throw new Error("Nome da variação é obrigatório");
    }
    
    // Ensure categoryIds is an array
    if (!variation.categoryIds) {
      variation.categoryIds = [];
    }
    
    // Ensure additionalPrice is a valid number
    if (typeof variation.additionalPrice !== 'number') {
      variation.additionalPrice = 0;
    }

    // Se ID está vazio ou não existe, é uma nova variação
    if (!variation.id || variation.id.trim() === "") {
      console.log("Criando nova variação (ID vazio)");
      const variationsCollection = collection(db, "variations");
      const { id, ...variationData } = variation; // Remove o ID vazio
      const docRef = await addDoc(variationsCollection, variationData);
      console.log("Nova variação criada com ID:", docRef.id);
      return docRef.id;
    } else {
      // Verificar se o documento realmente existe antes de tentar atualizar
      console.log("Verificando se a variação existe:", variation.id);
      const variationDocRef = doc(db, "variations", variation.id);
      const existingDoc = await getDoc(variationDocRef);
      
      if (existingDoc.exists()) {
        // Update existing variation
        console.log("Atualizando variação existente:", variation.id);
        const { id, ...variationData } = variation;
        await updateDoc(variationDocRef, variationData);
        console.log("Variação atualizada com sucesso");
        return variation.id;
      } else {
        // Documento não existe, criar novo
        console.log("Documento não existe, criando nova variação");
        const variationsCollection = collection(db, "variations");
        const { id, ...variationData } = variation; // Remove o ID que não existe
        const docRef = await addDoc(variationsCollection, variationData);
        console.log("Nova variação criada com ID:", docRef.id);
        return docRef.id;
      }
    }
  } catch (error) {
    console.error("Erro detalhado ao salvar variação:", error);
    throw new Error(`Falha ao salvar variação: ${error.message}`);
  }
};

export const deleteVariation = async (id: string): Promise<void> => {
  try {
    console.log("Tentando deletar variação com ID:", id);
    
    if (!id || id.trim() === "") {
      throw new Error("ID da variação é obrigatório para exclusão");
    }

    // Verificar se o documento existe antes de tentar deletar
    const variationDocRef = doc(db, "variations", id);
    const docSnapshot = await getDoc(variationDocRef);
    
    if (!docSnapshot.exists()) {
      console.log("Documento de variação não encontrado para exclusão:", id);
      throw new Error("Variação não encontrada no banco de dados");
    }
    
    console.log("Documento de variação encontrado, procedendo com a exclusão...");
    await deleteDoc(variationDocRef);
    console.log("Variação deletada com sucesso:", id);
  } catch (error) {
    console.error("Erro detalhado ao deletar variação:", error);
    throw new Error(`Falha ao deletar variação: ${error.message}`);
  }
};
