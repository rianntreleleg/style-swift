export async function handler(req: Request): Promise<Response> {
  return Response.json({ 
    message: "Function de teste funcionando!",
    timestamp: new Date().toISOString()
  });
}

export default handler;
