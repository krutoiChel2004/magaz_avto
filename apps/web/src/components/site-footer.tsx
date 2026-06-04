export function SiteFooter() {
  return (
    <footer className="site-shell pb-12 pt-16">
      <div className="footer-grid">
        <div>
          <p className="eyebrow">Контакты</p>
          <p className="footer-title">MCM Auto Store</p>
          <p className="footer-copy">
            Курган, ул. Омская, 179. Автозапчасти, расходники, багажные системы и
            аксессуары для ежедневной эксплуатации и дальних поездок.
          </p>
        </div>
        <div>
          <p className="eyebrow">Ассортимент</p>
          <p className="footer-copy">
            Масла, фильтры, тормозные компоненты, крепления, багажники и боксы на
            крышу в одном каталоге.
          </p>
        </div>
        <div>
          <p className="eyebrow">Режим работы</p>
          <p className="footer-copy">
            Пн-Пт 09:00-18:00
            <br />
            Сб 10:00-15:00
            <br />
            Вс выходной
          </p>
        </div>
      </div>
    </footer>
  );
}
