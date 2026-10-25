UPDATE vehicles
SET image_url = CASE
  WHEN make = 'Toyota' AND model = 'Camry' THEN '/images/cars/toyota-camry.svg'
  WHEN make = 'Honda' AND model = 'Civic' THEN '/images/cars/honda-civic.svg'
  WHEN make = 'Hyundai' AND model = 'Creta' THEN '/images/cars/hyundai-creta.svg'
  WHEN make = 'Tata' AND model = 'Nexon' THEN '/images/cars/tata-nexon.svg'
  WHEN make = 'BMW' AND model = '3 Series' THEN '/images/cars/bmw-3-series.svg'
  WHEN make = 'Maruti Suzuki' AND model = 'Swift' THEN '/images/cars/maruti-swift.svg'
  ELSE image_url
END
WHERE make IN ('Toyota','Honda','Hyundai','Tata','BMW','Maruti Suzuki');
