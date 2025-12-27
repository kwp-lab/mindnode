describe('Project Setup', () => {
  it('should have testing framework configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(1, 2)).toBe(3);
  });
});
