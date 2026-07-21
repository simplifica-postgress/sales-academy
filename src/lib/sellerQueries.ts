import {
  collection,
  query,
  where,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Consulta os documentos de um vendedor (uploads / analyses) já no formato
 * que as Rules aceitam.
 *
 * PEGADINHA DO FIRESTORE: regras NÃO são filtros. Numa consulta, o Firestore
 * exige que a própria consulta garanta que todo resultado é permitido — ele
 * não lê os documentos para descartar os proibidos, simplesmente nega tudo.
 *
 * - Dono lendo o próprio histórico: `where userId == eu` já prova a regra
 *   (`resource.data.userId == request.auth.uid`).
 * - Gestor lendo um vendedor: a regra checa `companyId`, então a consulta
 *   PRECISA filtrar por `companyId` também. Sem isso, mesmo com os dados
 *   corretos, a consulta inteira é negada.
 *
 * Filtrar por companyId não abre brecha: a regra continua comparando o valor
 * contra a empresa de quem pede, então informar outra empresa segue negado.
 */
export function sellerDocsQuery(
  col: "uploads" | "analyses",
  sellerUid: string,
  viewerUid: string | undefined,
  sellerCompanyId: string | null
): Query<DocumentData> {
  const base = collection(db, col);
  if (viewerUid && viewerUid === sellerUid) {
    return query(base, where("userId", "==", sellerUid));
  }
  return query(
    base,
    where("companyId", "==", sellerCompanyId),
    where("userId", "==", sellerUid)
  );
}
