export class PresenterUtils {
  static presenterPeriodGreeting(actualDateHour = new Date()) {
    const actualHour = actualDateHour.getHours();

    if (actualHour < 12) {
      return 'Bom dia';
    }

    if (actualHour < 19) {
      return 'Boa tarde';
    }

    return 'Boa noite';
  }
}
