export async function postJson(
  url: string,
  body: unknown,
  label: string
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `${label} notification failed: ${response.status} ${response.statusText}`
    );
  }
}
